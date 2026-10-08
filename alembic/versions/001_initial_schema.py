"""initial schema

Revision ID: 001
Revises: 
Create Date: 2024-03-24 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('leagues',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('country', sa.String(length=100), nullable=False),
        sa.Column('strength_rating', sa.Float(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index('ix_leagues_country', 'leagues', ['country'], unique=False)
    op.create_index('ix_leagues_name', 'leagues', ['name'], unique=True)

    op.create_table('clubs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('country', sa.String(length=100), nullable=False),
        sa.Column('league_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['league_id'], ['leagues.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index('ix_clubs_name', 'clubs', ['name'], unique=True)
    op.create_index('ix_clubs_league_id', 'clubs', ['league_id'], unique=False)

    op.create_table('players',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('date_of_birth', sa.Date(), nullable=False),
        sa.Column('nationality', sa.String(length=100), nullable=False),
        sa.Column('height_cm', sa.Integer(), nullable=True),
        sa.Column('preferred_foot', sa.String(length=10), nullable=True),
        sa.Column('primary_position', sa.String(length=5), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_players_name', 'players', ['name'], unique=False)
    op.create_index('ix_players_position', 'players', ['primary_position'], unique=False)
    op.create_index('ix_players_nationality', 'players', ['nationality'], unique=False)

    op.create_table('model_runs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('model_version', sa.String(length=50), nullable=False),
        sa.Column('trained_at', sa.DateTime(), nullable=True),
        sa.Column('model_type', sa.String(length=100), nullable=False),
        sa.Column('mae', sa.Float(), nullable=True),
        sa.Column('rmse', sa.Float(), nullable=True),
        sa.Column('r2', sa.Float(), nullable=True),
        sa.Column('train_start', sa.String(length=10), nullable=True),
        sa.Column('train_end', sa.String(length=10), nullable=True),
        sa.Column('val_season', sa.String(length=10), nullable=True),
        sa.Column('test_season', sa.String(length=10), nullable=True),
        sa.Column('n_train_samples', sa.Integer(), nullable=True),
        sa.Column('n_features', sa.Integer(), nullable=True),
        sa.Column('feature_names', sa.JSON(), nullable=True),
        sa.Column('evaluation_data', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('model_version')
    )
    op.create_index('ix_mr_version', 'model_runs', ['model_version'], unique=False)

    op.create_table('market_values',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('player_id', sa.Integer(), nullable=False),
        sa.Column('valuation_date', sa.Date(), nullable=False),
        sa.Column('market_value_eur', sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(['player_id'], ['players.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_mv_player_id', 'market_values', ['player_id'], unique=False)
    op.create_index('ix_mv_date', 'market_values', ['valuation_date'], unique=False)

    op.create_table('model_predictions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('player_id', sa.Integer(), nullable=False),
        sa.Column('prediction_date', sa.Date(), nullable=False),
        sa.Column('predicted_value_eur', sa.Float(), nullable=False),
        sa.Column('actual_market_value_eur', sa.Float(), nullable=True),
        sa.Column('difference_percent', sa.Float(), nullable=True),
        sa.Column('model_version', sa.String(length=50), nullable=False),
        sa.ForeignKeyConstraint(['player_id'], ['players.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_mp_player_id', 'model_predictions', ['player_id'], unique=False)
    op.create_index('ix_mp_date', 'model_predictions', ['prediction_date'], unique=False)

    op.create_table('player_club_history',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('player_id', sa.Integer(), nullable=False),
        sa.Column('club_id', sa.Integer(), nullable=False),
        sa.Column('season', sa.String(length=10), nullable=False),
        sa.Column('is_current', sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(['club_id'], ['clubs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['player_id'], ['players.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_pch_player_id', 'player_club_history', ['player_id'], unique=False)
    op.create_index('ix_pch_club_id', 'player_club_history', ['club_id'], unique=False)
    op.create_index('ix_pch_season', 'player_club_history', ['season'], unique=False)
    op.create_index('ix_pch_player_season', 'player_club_history', ['player_id', 'season'], unique=True)

    op.create_table('season_stats',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('player_id', sa.Integer(), nullable=False),
        sa.Column('club_id', sa.Integer(), nullable=False),
        sa.Column('season', sa.String(length=10), nullable=False),
        sa.Column('appearances', sa.Integer(), nullable=True),
        sa.Column('minutes', sa.Integer(), nullable=True),
        sa.Column('goals', sa.Integer(), nullable=True),
        sa.Column('assists', sa.Integer(), nullable=True),
        sa.Column('xg', sa.Float(), nullable=True),
        sa.Column('xa', sa.Float(), nullable=True),
        sa.Column('shots', sa.Float(), nullable=True),
        sa.Column('key_passes', sa.Float(), nullable=True),
        sa.Column('progressive_passes', sa.Float(), nullable=True),
        sa.Column('progressive_carries', sa.Float(), nullable=True),
        sa.Column('tackles', sa.Float(), nullable=True),
        sa.Column('interceptions', sa.Float(), nullable=True),
        sa.Column('aerial_wins', sa.Float(), nullable=True),
        sa.Column('recoveries', sa.Float(), nullable=True),
        sa.Column('clean_sheets', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['club_id'], ['clubs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['player_id'], ['players.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_ss_player_id', 'season_stats', ['player_id'], unique=False)
    op.create_index('ix_ss_season', 'season_stats', ['season'], unique=False)
    op.create_index('ix_ss_player_season', 'season_stats', ['player_id', 'season'], unique=False)

    op.create_table('transfers',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('player_id', sa.Integer(), nullable=False),
        sa.Column('from_club_id', sa.Integer(), nullable=True),
        sa.Column('to_club_id', sa.Integer(), nullable=True),
        sa.Column('transfer_date', sa.Date(), nullable=False),
        sa.Column('fee_eur', sa.Float(), nullable=True),
        sa.Column('transfer_type', sa.String(length=50), nullable=True),
        sa.ForeignKeyConstraint(['from_club_id'], ['clubs.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['player_id'], ['players.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['to_club_id'], ['clubs.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_transfers_player_id', 'transfers', ['player_id'], unique=False)
    op.create_index('ix_transfers_date', 'transfers', ['transfer_date'], unique=False)


def downgrade() -> None:
    op.drop_table('transfers')
    op.drop_table('season_stats')
    op.drop_table('player_club_history')
    op.drop_table('model_predictions')
    op.drop_table('market_values')
    op.drop_table('model_runs')
    op.drop_table('players')
    op.drop_table('clubs')
    op.drop_table('leagues')
