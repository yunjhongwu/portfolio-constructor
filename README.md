# Portfolio-constructor
 * Construct portfolios by constrained quadratic optimization --- minizing volatility, maxizing returns, and reducing over-fitting by encouraging to equally invest in all positions.
 * Price data is sourced from Yahoo finance.

![alt tag](https://cloud.githubusercontent.com/assets/6327275/8897664/0f2008da-33ce-11e5-8ee9-efa2cc0f9ac5.png)

1. Frontend tested in Chrome 44 and Firefox 39
 * Some D3.js animation are turned off in Firefox.

2. Backend written in Python 3.4, required the following libraries:
 * Cvxopt 1.1.7
 * Flask 0.10.1
 * Numpy 1.9.2

3. Get start using the constructor
 * Run "python3 index.py" in terminal.
 * Open 127.0.0.1:5000 in a browser.
 * Select start- and end-date; add more tickers.
 * Click "Quote" to pull data and fit model.
 * Fit the model according to your risk-appetite.
 * Click red circles in the panel of "efficient frontier" to get constructed portfolios.

4. (Over-)simplification about this constructor
 * Reinvest dividends.
 * Ignore tax, commission fees, price spreads, and price fluctuation in a day.
