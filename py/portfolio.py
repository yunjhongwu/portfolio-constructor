# -*- coding: utf-8 -*-
# Created on Sun Jul 26 01:08:18 2015
# Implemented in Python 3.4.0
# Author: Yun-Jhong Wu
# E-mail: yjwu@umich.edu

import numpy as np
import pandas as pd
import pandas.io.data as pull

from cvxopt import matrix, solvers
from datetime import datetime
from flask import jsonify, request

def getConstraints(k, short, df):
    if short:
        n = 2 * k - 1
        G = np.zeros((n + 1, n))  
        G[:k, :k] = -np.identity(k)
        G[:k - 1, k:] = np.identity(k - 1)
        G[k:-1, k:] = np.identity(k - 1)
        G[-1, k:] = -1
        G = matrix(G)
        
        h = matrix(np.append(np.zeros(n), 1))
    else:        
        n = k
        G = matrix(-np.identity(k))
        h = matrix(np.zeros(k))
        
    Q = np.zeros((n, n))
    p = np.zeros(n)
    A = np.zeros(n)
    A[:k] = 1
    A = matrix(A[None, :])
    b = matrix(1.0)

    vol = np.cov((df.iloc[1:, :] / df.shift(1).iloc[1:, :]).T) * df.shape[0]
    ret = (np.array(df.tail(1)) / np.array(df.head(1))).ravel()
    
    return Q, p, G, h, A, b, vol, ret

def getPortfolio(df, unused, lbd, short=False, l2=0):
    """
    $\beta^\top (\Sigma + \lambda \mu\mu^\top)\beta - 2\lambda\mu^\top\beta
    """
    
    T, k = df.shape
    Q, p, G, h, A, b, vol, ret = getConstraints(k, short, df)
    
    Q[:k, :k] = (1 - lbd) * vol + lbd * ret[:, None] * ret + 2 * np.max(np.diagonal(vol)) * l2 * np.identity(k)
    Q = 2 * matrix(Q)
    p[:k] = -2 * lbd * ret * (2 * np.max(ret) - np.min(ret) if short else np.max(ret))
    p = matrix(p)

    sol = solvers.qp(Q, p, G, h, A, b)
    pos = np.array(sol['x']).ravel()[:k]
    pos[np.isclose(pos, 0, atol=1e-3)] = 0
    pos /= np.sum(pos)

    df["pos"] = df.dot(pos)
    perf = df["pos"].to_frame().reset_index()
    perf["index"] = perf["index"].map(lambda d: str(d.date()))
    perf.columns = ["date", "value"]
    allocation = { "L": [{"symbol": s, "p": 0} for s in unused], "S": [], 
                   "min": perf["value"].min(),
                   "max": perf["value"].max(),
                   "series": perf.T.to_json() }
                   
    category = lambda x : "S" if x < 0 else "L"

    for i, p in enumerate(pos):
        allocation[category(p)].append({ "symbol": df.columns[i], "p": p })

    allocation["ret"] = (ret.dot(pos) ** ( 365 / T ) - 1) * 100
    allocation["vol"] = np.sqrt(pos.dot(vol).dot(pos)) * ( 365 / T ) * 100
    allocation["status"] = sol["status"]
    
    return jsonify(allocation)    

def getRebalance(df, freq, pos):    
    reweight = df.groupby(pd.Grouper(freq=freq)).head(1)
    p = pos.copy()
    for idx, row in reweight.iterrows():
        p = pos / row * row.dot(p)   
        reweight.loc[idx, :] = np.array(p)

    perf = df.groupby(pd.Grouper(freq=freq)).apply(lambda x: x.dot(reweight.loc[x.index[0], :])).to_frame()
    perf.index = perf.index.droplevel(0)
    perf = perf.reset_index()
    perf["index"] = perf["index"].map(lambda d: str(d.date()))
    perf.columns = ["date", "value"]
    dailyret = np.array(perf["value"])
    dailyret = dailyret[1:] / dailyret[:-1]
    
    return jsonify({ "min": perf["value"].min(),
                     "max": perf["value"].max(),
                     "ret": (perf["value"].iloc[-1] ** (365 / perf["value"].size) - 1) * 100,
                     "vol": np.std(dailyret) * 365 / dailyret.size * 100,
                     "series": perf.T.to_json() })

def getFrontier(df, short):
    T, k = df.shape

    Q, p, G, h, A, b, vol, ret = getConstraints(k, short, df)
    
    Q[:k, :k] = vol
    Q = 2 * matrix(Q)
    p = matrix(p)
    A = np.zeros((2, p.size[0]))
    A[0, :k] = 1
    A[1, :k] = ret
    A = matrix(A)

    target = np.arange(1, (2 * np.max(ret) - np.min(ret)) if short else np.max(ret), 0.002)    
    frontier = {}
    for i, alpha in enumerate(target):
        b = matrix([1, alpha])
        sol = solvers.qp(Q, p, G, h, A, b)
        if sol["status"] == "optimal":
            pos = np.array(sol['x']).ravel()[:k]
            frontier[i] = { "ret": (alpha ** ( 365 / T ) - 1) * 100, 
                            "vol": np.sqrt(pos.dot(vol).dot(pos)) * ( 365 / T ) * 100 }

    return jsonify(frontier)

def getData():
    raw = pd.read_json(request.form["data"])    
    symbols = list(raw.columns)
    if "Currency" in symbols:
        symbols.remove("Currency")
        symbols.append("Currency")
    data = pd.DataFrame(columns=symbols)
    
    for symbol in raw.columns:
        idx, val = zip(*list(map(lambda d: (datetime.strptime(d["date"][:10], "%Y-%m-%d").date(), d["value"]), raw[symbol])))
        data[symbol] = pd.Series(data=val, index=pd.DatetimeIndex(idx))
    
    return data

def pullDataFromYahoo(symbol, startdate, enddate):
    dates = pd.DatetimeIndex(start=startdate, end=enddate, freq='1d')
    data = pd.DataFrame(index=dates)
    
    try:
        tmp = pull.DataReader(symbol, 'yahoo', 
                              startdate, enddate)
        data["price"] = tmp["Close"]
        data["value"] = tmp["Adj Close"]
        data = data.interpolate().ffill().bfill()
        data["value"] /= data["value"][0]
        data = data.reset_index()
        data["date"] = data["index"].apply(lambda d: str(d.date()))
        dailyret = np.array(data["value"])
        dailyret = dailyret[1:] / dailyret[:-1]
        return jsonify({ "series": data.drop("index", 1).T.to_json(),
                            "ret": (data["value"].iloc[-1] ** ( 365 / data["value"].size ) - 1) * 100,
                            "vol": np.std(dailyret) * 365 / dailyret.size * 100 })

    except:
        return "invalid"