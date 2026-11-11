from .analytics import AnalyticsStatsMixin
from .cloud_backup import CloudBackupMixin
from .community import CommunityStatsMixin
from .preferences import PreferenceStatsMixin
from .storage import StorageMixin
from .streaks import StreakStatsMixin
from .shared import *


class StatsManager(
    StorageMixin,
    CloudBackupMixin,
    CommunityStatsMixin,
    StreakStatsMixin,
    AnalyticsStatsMixin,
    PreferenceStatsMixin,
):
    pass
