"""
Rogue-Day Game Configuration
Единый источник правды для игровых констант.
"""

from typing import TypedDict


class TierConfigItem(TypedDict):
    energy_cost: int
    base_xp: int
    duration_min: int
    can_fail: bool


# Game constants
GAME_CONFIG = {
    "BASE_MAX_ENERGY": 50,
    "ENERGY_REGEN_PER_MINUTE": 0.5,
    "AUTH_EXPIRATION_SECONDS": 86400,  # 24 hours
}

# Tier configuration - unified source of truth
TIER_CONFIG: dict[int, TierConfigItem] = {
    1: {"energy_cost": 0, "base_xp": 15, "duration_min": 2, "can_fail": False},
    2: {"energy_cost": 5, "base_xp": 65, "duration_min": 10, "can_fail": True},
    3: {"energy_cost": 15, "base_xp": 175, "duration_min": 25, "can_fail": True},
}


def get_tier_config(tier: int) -> TierConfigItem | None:
    """Get configuration for a specific tier."""
    return TIER_CONFIG.get(tier)


def calculate_xp(tier: int, duration: int, use_timer: bool) -> int:
    """
    Calculate XP for a task.
    
    Args:
        tier: Task tier (1, 2, or 3)
        duration: Task duration in minutes
        use_timer: Whether timer was used
    
    Returns:
        Calculated XP value
    """
    config = TIER_CONFIG.get(tier)
    if not config:
        return 0
    
    base_xp = config["base_xp"]
    duration_min = config["duration_min"]
    
    # Duration multiplier
    duration_multiplier = duration / duration_min
    
    # Timer bonus (T2 without timer = 80%)
    timer_multiplier = 1.0 if use_timer else 0.8
    
    return int(base_xp * duration_multiplier * timer_multiplier)
