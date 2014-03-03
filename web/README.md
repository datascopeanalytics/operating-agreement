To view this visualization

1. clone this repository `git clone https://github.com/datascopeanalytics/operating-agreement.git`,
2. go into the web directory `cd operating-agreement/web`,
3. run the `./run_server.sh` script which will start hosting a web server,
4. open `http://localhost:8000` in your browser, and
5. behold.

This is used to explain how liquidation proceeds are distributed among
members where there are two different classes of units: Class A units
(capital interest units) and Class B units (profits interest units).

Suppose there are 4 different issuances of units. The total width of
the vertical bands is proportional to the number of units in each unit
issuance and the colors in each band are intended to represent the
units that each member owns. To calculate the total distribution to
each member, take the portion of money between consecutive pairs of
dashed lines and divvy it up among the unit holders in proportion to
the width that they own.
