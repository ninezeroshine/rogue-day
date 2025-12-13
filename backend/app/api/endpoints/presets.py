"""
Presets API endpoints.
Named collections of task templates for quick daily setup.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import (
    Preset, PresetTemplate, TaskTemplate, Task, Run, User, 
    RunStatus, TaskStatus
)
from app.schemas import (
    PresetCreate, PresetUpdate, PresetResponse, PresetApplyResponse, 
    TaskTemplateResponse
)
from app.api.dependencies import get_current_user
from app.core.game_config import TIER_CONFIG, calculate_xp

router = APIRouter()


async def _validate_templates(
    template_ids: list[int],
    user_id: int,
    db: AsyncSession
) -> dict[int, TaskTemplate]:
    """
    Validate and load all templates in one query (prevents N+1).
    Returns dict mapping template_id -> TaskTemplate.
    """
    if not template_ids:
        return {}
    
    result = await db.execute(
        select(TaskTemplate)
        .where(
            TaskTemplate.id.in_(template_ids),
            TaskTemplate.user_id == user_id
        )
    )
    templates = result.scalars().all()
    return {t.id: t for t in templates}


def _preset_to_response(preset: Preset) -> PresetResponse:
    """Convert Preset ORM model to response schema."""
    sorted_links = sorted(preset.template_links, key=lambda x: x.order)
    templates = [
        TaskTemplateResponse.model_validate(link.template) 
        for link in sorted_links
    ]
    return PresetResponse(
        id=preset.id,
        name=preset.name,
        emoji=preset.emoji,
        is_favorite=preset.is_favorite,
        templates=templates,
        created_at=preset.created_at,
    )


@router.get("/", response_model=list[PresetResponse])
async def list_presets(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all presets for user with their templates."""
    result = await db.execute(
        select(Preset)
        .where(Preset.user_id == user.id)
        .options(
            selectinload(Preset.template_links)
            .selectinload(PresetTemplate.template)
        )
        .order_by(Preset.is_favorite.desc(), Preset.created_at.desc())
    )
    presets = result.scalars().all()
    
    return [_preset_to_response(p) for p in presets]


@router.post("/", response_model=PresetResponse)
async def create_preset(
    data: PresetCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new preset with optional initial templates."""
    preset = Preset(
        user_id=user.id,
        name=data.name,
        emoji=data.emoji,
        is_favorite=data.is_favorite,
    )
    db.add(preset)
    await db.flush()
    
    # Add templates if provided - load all in one query
    if data.template_ids:
        templates_dict = await _validate_templates(data.template_ids, user.id, db)
        
        for idx, template_id in enumerate(data.template_ids):
            if template_id in templates_dict:
                link = PresetTemplate(
                    preset_id=preset.id,
                    template_id=template_id,
                    order=idx,
                )
                db.add(link)
    
    await db.flush()
    
    # Reload with templates
    result = await db.execute(
        select(Preset)
        .where(Preset.id == preset.id)
        .options(
            selectinload(Preset.template_links)
            .selectinload(PresetTemplate.template)
        )
    )
    preset = result.scalar_one()
    
    return _preset_to_response(preset)


@router.get("/{preset_id}", response_model=PresetResponse)
async def get_preset(
    preset_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single preset by ID."""
    result = await db.execute(
        select(Preset)
        .where(Preset.id == preset_id, Preset.user_id == user.id)
        .options(
            selectinload(Preset.template_links)
            .selectinload(PresetTemplate.template)
        )
    )
    preset = result.scalar_one_or_none()
    
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    return _preset_to_response(preset)


@router.patch("/{preset_id}", response_model=PresetResponse)
async def update_preset(
    preset_id: int,
    data: PresetUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update preset (name, emoji, favorite status, or templates)."""
    result = await db.execute(
        select(Preset)
        .where(Preset.id == preset_id, Preset.user_id == user.id)
        .options(selectinload(Preset.template_links))
    )
    preset = result.scalar_one_or_none()
    
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    # Update simple fields
    if data.name is not None:
        preset.name = data.name
    if data.emoji is not None:
        preset.emoji = data.emoji
    if data.is_favorite is not None:
        preset.is_favorite = data.is_favorite
    
    # Update templates if provided - load all in one query
    if data.template_ids is not None:
        # Remove existing links
        for link in preset.template_links:
            await db.delete(link)
        
        # Validate and load all templates in one query
        templates_dict = await _validate_templates(data.template_ids, user.id, db)
        
        # Add new links
        for idx, template_id in enumerate(data.template_ids):
            if template_id in templates_dict:
                link = PresetTemplate(
                    preset_id=preset.id,
                    template_id=template_id,
                    order=idx,
                )
                db.add(link)
    
    await db.flush()
    
    # Reload with templates
    result = await db.execute(
        select(Preset)
        .where(Preset.id == preset.id)
        .options(
            selectinload(Preset.template_links)
            .selectinload(PresetTemplate.template)
        )
    )
    preset = result.scalar_one()
    
    return _preset_to_response(preset)


@router.post("/{preset_id}/apply", response_model=PresetApplyResponse)
async def apply_preset(
    preset_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Apply preset: create tasks from all templates in current active run.
    
    Energy is checked per task. Tasks are added as PENDING even if 
    energy is low — the user simply can't start high-tier tasks until
    they recover energy.
    """
    # Get preset with templates
    result = await db.execute(
        select(Preset)
        .where(Preset.id == preset_id, Preset.user_id == user.id)
        .options(
            selectinload(Preset.template_links)
            .selectinload(PresetTemplate.template)
        )
    )
    preset = result.scalar_one_or_none()
    
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    # Get active run
    run_result = await db.execute(
        select(Run).where(Run.user_id == user.id, Run.status == RunStatus.ACTIVE)
    )
    run = run_result.scalar_one_or_none()
    
    if not run:
        raise HTTPException(status_code=404, detail="No active run. Start a run first.")
    
    # Create tasks from templates
    tasks_created = 0
    tasks_skipped = 0
    total_energy_cost = 0
    
    sorted_links = sorted(preset.template_links, key=lambda x: x.order)
    
    for link in sorted_links:
        template = link.template
        config = TIER_CONFIG.get(template.tier)
        
        if not config:
            tasks_skipped += 1
            continue
        
        energy_cost = config["energy_cost"]
        
        # Check energy — only spend if we have enough
        if run.focus_energy < energy_cost:
            tasks_skipped += 1
            continue
        
        # Calculate XP using centralized function
        xp_earned = calculate_xp(template.tier, template.duration, template.use_timer)
        
        # Spend energy and create task
        run.focus_energy -= energy_cost
        total_energy_cost += energy_cost
        
        task = Task(
            run_id=run.id,
            title=template.title,
            tier=template.tier,
            duration=template.duration,
            status=TaskStatus.PENDING,
            xp_earned=xp_earned,
            energy_cost=energy_cost,
            use_timer=template.use_timer,
        )
        db.add(task)
        
        # Update template usage counter
        template.times_used += 1
        
        tasks_created += 1
    
    await db.flush()
    
    # Build response message
    if tasks_skipped > 0:
        message = f"Добавлено {tasks_created} задач. {tasks_skipped} пропущено (недостаточно энергии)."
    else:
        message = f"Добавлено {tasks_created} задач из пресета «{preset.name}»"
    
    return PresetApplyResponse(
        tasks_created=tasks_created,
        tasks_skipped=tasks_skipped,
        total_energy_cost=total_energy_cost,
        message=message,
    )


@router.delete("/{preset_id}")
async def delete_preset(
    preset_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a preset (templates are preserved)."""
    result = await db.execute(
        select(Preset)
        .where(Preset.id == preset_id, Preset.user_id == user.id)
    )
    preset = result.scalar_one_or_none()
    
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    await db.delete(preset)
    await db.flush()
    
    return {"status": "deleted"}
