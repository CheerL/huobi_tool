import configparser
import os

from utils.logging import create_logger, quite_logger

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(ROOT, 'config.ini')
USER_CONFIG_PATH = os.path.join(ROOT, 'user.ini')
LOG_PATH = os.path.join(ROOT, 'log', 'trade.log')

logger_name = 'loss'
logger = create_logger(logger_name, LOG_PATH)
quite_logger(all_logger=True, except_list=[logger_name])
config = configparser.ConfigParser()
if os.path.exists(CONFIG_PATH):
    config.read(CONFIG_PATH)

user_config = configparser.ConfigParser()
if os.path.exists(USER_CONFIG_PATH):
    user_config.read(USER_CONFIG_PATH)

def get_level(level):
    level_coff = {
        '1day': 1,
        '24hour': 1,
        '12hour': 2,
        '8hour': 3,
        '6hour': 4,
        '4hour': 6,
        '3hour': 8,
        '2hour': 12,
        '1hour': 24,
        '30min': 48,
        '15min': 96,
        '5min': 288,
        '1min': 1440
    }[level]
    level_ts = int(86400 / level_coff)
    return level_coff, level_ts
