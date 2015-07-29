# -*- coding: utf-8 -*-
# Created on Sun Jul 19 13:20:27 2015
# Implemented in Python 3.4.0
# Author: Yun-Jhong Wu
# E-mail: yjwu@umich.edu


import numpy as np
import pandas as pd

from cvxopt import solvers
from datetime import datetime
from flask import Flask, render_template, request

from py.portfolio import getData, getPortfolio, getFrontier, getRebalance, pullDataFromYahoo

app = Flask(__name__, static_folder='static', static_url_path='')

@app.route('/', methods=['GET', 'POST'])
def _index():
    return render_template('index.html')

@app.route('/_pull', methods=['POST'])
def _pullData():
    symbol = request.form["symbol"]
    startdate = datetime.strptime(request.form["startdate"], "%Y-%m-%d").date()
    enddate = datetime.strptime(request.form["enddate"], "%Y-%m-%d").date()
    
    return pullDataFromYahoo(symbol, startdate, enddate)
    
@app.route('/_fit', methods=['POST'])
def _fitModel():
    risk = float(request.form["risk"])
    short = request.form["shor"] == "true"
    unused = filter(lambda s: len(s) > 0, request.form["unused"].split(","))
    l2 = float(request.form["l2"])
    data = getData()

    return getPortfolio(data, unused, risk, short, l2)

@app.route('/_frontier', methods=['POST'])
def _fitFrontier():
    short = request.form["shor"] == "true"
    df = getData()
        
    return getFrontier(df, short)
    
@app.route('/_rebalancing', methods=['POST'])
def _rebalancing():
    df = getData()
    pos = { row["symbol"]: row["p"] for _, row in pd.read_json(request.form["pos"]).iterrows() }
    pos = np.array([pos[s] for s in df.columns])
    freq = str(request.form["rbfreq"]) + "m"
    
    return getRebalance(df, freq, pos)
    
if __name__ == '__main__':
    solvers.options['show_progress'] = False
    app.run(debug=True)
