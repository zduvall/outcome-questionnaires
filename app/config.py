import os


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    SQLALCHEMY_ECHO = True

    # I set this up in case I ever had more than one product, in order to
    # dynamically store the subscription type. A subType of 1 is a basic
    # monthly subscription and 0 (default) is free/none.
    # Make sure to update this in addition to priceID in Payment3.js if
    # change subscription price
    PRODUCT_DICT = {"prod_Jduf0NBJjssJpL": 1}
