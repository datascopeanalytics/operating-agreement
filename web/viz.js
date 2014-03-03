var golden_ratio = (1 + Math.sqrt(5))/2;
var margin = {top: 20, right: 20, bottom: 30, left: 100},
width = $("body").width() - margin.left - margin.right,
height = 350 - margin.top - margin.bottom;
var junk = {
    pad: 2,
    rx: 4,
    ry: 8,
    width: 30,
    height: 9,
    xoff: 6,
    spacing: 1.2,
};

var fake_names = [
    "Alfred",
    "Betty",
    "Charlie",
    "Donna",
    "Eric",
    "Francis",
    "Gretta",
    "Hal",
    "Irene",
];

// var start_dates. Months in a Date object are zero-based (WTF!!!)
var founding_date = new Date(2011,0,1);
var member_data = [{
    "start_date": founding_date,
    "founder": true,
    "units": [],
    "equity": [],
}, {
    "start_date": founding_date,
    "founder": true,
    "units": [],
    "equity": [],
}, {
    "start_date": new Date(2011,10,1), // 2011-11-1
    "founder": false,
    "units": [],
    "equity": [],
}, {
    "start_date": new Date(2012,10,1), // 2011-11-1
    "founder": false,
    "units": [],
    "equity": [],
}];
member_data.forEach(function (d, i) {
    d.name=fake_names[i];
});

// company data
var company_data = [{ // capital interest units prior to jan 1 2012
    "series": "pre-2012 units",
    "value": 0,
    "total_units": 500,
    "issue_date": new Date(2011,0,1), // 2011-1-1
    //"issue_date": d3.min(member_data, function (d) {if(d.founder) return d.start_date}),
}, { // profits interest units issued on jan 1 2012
    "series": "2012 units",
    "value": 20000000,
    "issue_date": new Date(2012,0,1), // 2012-1-1
}, { // profits interest units issued on jan 1 2013
    "series": "2013 units",
    "value": 42000000,
    "issue_date": new Date(2013,0,1), // 2013-1-1
}, { // profits interest units issued on jan 1 2014
    "series": "2014 units",
    "value": 55000000,
    "issue_date": new Date(2014,0,1), // 2014-1-1
}, {
    "series": "liquidation",
    "value": 77000000,
    "issue_date": new Date(2014,11,31), // 2014-12-31
}];

// function to calculate the number of class B units issued. should be
// proportionaly to company value in some way (in this case, directly
// proportional).
function value2units(v) {
    return v/1000;
};

// function to calculate the units for each member
function calculate_member_units() {

    // initialize data structures as necessary
    if (member_data[0].units.length === 0) {
	company_data.forEach(function (datum, i) {
	    member_data.forEach(function (d) {
		d.units.push(0);
		if (i<company_data.length-1) { // exclude liquidation
		    d.equity.push(0);
		} 
	    });
	});
    }

    // calculate the number of Class A units for each founder. Assume
    // initial units are split evenly
    var n_founders=member_data.filter(function(d, i){return d.founder}).length;
    member_data.forEach(function (d, i) {
	if (d.founder) {
	    d.units[0] = company_data[0].total_units / n_founders;
	}
	else {
	    d.units[0] = 0;
	}
    });

    // calculate the number of Class B units for each member in each
    // series
    company_data.forEach(function (datum, i) {
	if (i>0) {
	    
	    // calculate the total number of units based on the value
	    var total_units = value2units(datum.value);
	    
	    // split total units in proportion to amount of time donated to
	    // start "new" company
	    var dts = member_data.map(function (d) {
		return d3.max([0, datum.issue_date - d.start_date]);
	    });
	    var total_dt = d3.sum(dts);
	    
	    member_data.forEach(function (d, j) {
		d.units[i] = total_units * dts[j] / total_dt;
	    });
	}
    });

    // calculate the member equity over time
    var cumulative_total_units, cumulative_member_units=[];
    member_data.forEach(function () {
	cumulative_member_units.push(0);
    });
    company_data.forEach(function (datum, i) {
	if (i<company_data.length-1) { // do not include liquidation
	    member_data.forEach(function (d, j) {
		cumulative_member_units[j] += d.units[i];
	    })
	    cumulative_total_units = d3.sum(cumulative_member_units);
	    member_data.forEach(function (d, j) {
		d.equity[i] = cumulative_member_units[j] / cumulative_total_units;
	    });
	}
    });
}

// initialize the data
calculate_member_units();

// calculate the data for the liquidation bars
function calculate_liquidation_bars_data (new_member) {
    
    // get the eligibile proceeds data
    var eligible_info = calculate_eligible_info();

    // get a mapping from series to index
    var series2index = {};
    company_data.forEach(function (datum, i) {
	series2index[datum.series] = i;
    });

    // initialize the company_data.bars data structure if necessary
    company_data.forEach(function (d, i, a) {

	if (d.bars === undefined) {
	    d.proceeds_bars = [];
	    d.bars = [];
	    eligible_info.series.forEach(function () {
		member_data.forEach(function (x, member) {
		    d.bars.push({});
		})
	    })
	    if (d.series==="liquidation") {
		member_data.forEach(function () {
		    d.proceeds_bars.push({});
		})
	    }
	}

	// a new member was added; add corresponding bars
	else if (new_member) {
	    eligible_info.series.forEach(function (series, j) {
		var k = member_data.length-1;
		d.bars.splice((j+1)*member_data.length-1, 0, {});
	    });
	    if (d.series==="liquidation") {
		d.proceeds_bars.push({});
	    }
	}
    })

    // calculate the various bars for everything except the
    // liquidation data
    company_data.forEach(function (d, i, a) {
	if (d.series !== "liquidation") {

    	    // calculate the member equity
    	    var member_equity = member_data.map(function (md) {
    		return md.units[i];
    	    });
    	    var total_units = d3.sum(member_equity);
    	    member_equity.forEach(function (v, j, b) {
    		b[j] = v / total_units;
    	    });
	    
    	    // add all of the boxes data for this series
    	    var value_min = 0, series_share;
    	    eligible_info.series.forEach(function (series, j) {
    		series_share = d3.sum(member_data.map(function (md) {
    		    return md.units[i];
    		})) / d3.sum(eligible_info.member_units[j]);
		if (series_share === Infinity) {
		    series_share = 0;
		}
    		if (d.value>value_min) {
    		    series_share = 0;
    		}
    		var cumulative_member_equity = 0, bar;
    		member_equity.forEach(function (me, k) {
    		    bar = d.bars[j*member_equity.length+k];
    		    bar.member = k;
		    bar.issue_date = d.issue_date;
		    bar.units = me*total_units;
    		    bar.value_min = value_min;
    		    bar.value_max = value_min + eligible_info.proceeds[j];
    		    bar.series_share = series_share;
    		    bar.member_equity = me;
    		    bar.cumulative_member_equity = cumulative_member_equity;
    		    cumulative_member_equity += me;
    		});
    		value_min = bar.value_max;
    	    });
	}
    });

    // put the total liquidation proceeds data in the bars
    var d = company_data[company_data.length-1];
    d.bars = [];
    var proceeds = liquidation_proceeds(), s=0;
    proceeds.forEach(function (p, member) {
	d.proceeds_bars[member].series = d.series;
	d.proceeds_bars[member].value_min = s;
	d.proceeds_bars[member].value_max = s+p;
	d.proceeds_bars[member].member = member;
	d.proceeds_bars[member].issue_date = d.issue_date;
	s = d.proceeds_bars[member].value_max;
    });

    // calculate the total number of members for each series
    company_data.forEach(function (d, i) {
	d.n_members = member_data.filter(function (datum, j) {
	    return datum.start_date <= d.issue_date;
	}).length
    });
};

function calculate_eligible_info () {
    var eligible_info = {series: [], member_units: [], proceeds: []};

    // create a mapping from series label to index
    var series2index = {};
    company_data.forEach(function (datum, i) {
	series2index[datum.series] = i;
    });

    // create a copy of the company data that is ordered by
    // value. append the liduidation value data in there too
    var ordered_company_data = company_data.map(function (datum) {
	return datum
    });
    ordered_company_data.sort(function (a, b) {
	return a.value - b.value;
    });

    // calculate the difference in value between the consecutive unit
    // valuations and keep track of the number of units for each
    // member that split those proceeds
    var a, b, eligible_proceeds;
    for (var i=0;i<ordered_company_data.length-1;i++) {
	a = ordered_company_data[i];
	b = ordered_company_data[i+1];

	// rembmer the series for which this applies
	eligible_info.series.push(a.series);

	// calculate the eligible proceeds for each class of stock
	if (b.value <= company_data[company_data.length-1].value) {
	    eligible_info.proceeds.push(b.value - a.value)
	}
	else {
	    eligible_info.proceeds.push(0)
	}

	// calculate the number of units that each member has for this
	// distribution
	var eligible_member_units = member_data.map(function () {return 0;});
	company_data.map(function (datum, j) {
	    if(datum.value < b.value) {
		member_data.forEach(function (d, k) {
		    eligible_member_units[k] += 
		    d.units[series2index[datum.series]];
		});
	    }
	});
	eligible_info.member_units.push(eligible_member_units);
    }
    return eligible_info;
}

// calculate the liquidation proceeds for all members
function liquidation_proceeds () {
    var proceeds = [];
    member_data.forEach(function (d, j) {
	proceeds.push(0);
    });
    
    // calculate the proceeds for each available series of units for
    // each member
    eligible_info = calculate_eligible_info();
    eligible_info.member_units.forEach(function (units, i) {
	var p = eligible_info.proceeds[i];
	var s = eligible_info.series[i];
	var U = d3.sum(units);
	units.forEach(function (u, j) {
	    if (u>0) {
		proceeds[j] += p*u/U;
	    }
	});
    });
    return proceeds;
}

// generate the color scale using colorbrewer
var member_ids = d3.range(fake_names.length);
var color = d3.scale.ordinal()
    .domain(member_ids)
    .range(colorbrewer.Spectral[member_ids.length]);

var time_format = d3.time.format("%Y.%m.%d");
var unit_format = d3.format(",.0f");
var _value_format = d3.format(",.0f"); //(".3s");
var value_format = function (value) {
    return "$" + _value_format(value);
}
var equity_format = d3.format(".0%");

var ts = company_data.map(function (d) {return d.issue_date})
    .filter(function (d) {if (d!==undefined) return true});
var x = d3.time.scale()
    .rangeRound([0,width])
    .domain([d3.time.month.offset(d3.min(ts),-6), d3.time.month.offset(d3.max(ts),6)]);
x.rangeBand = function () {
    var t1 = company_data[1].issue_date;
    var t2 = d3.time.year.offset(t1, 1)
    return x(t2) - x(t1);
}

var y = d3.scale.linear()
    .range([height, 0])
    .domain([0, d3.max(company_data, function(d) { return d.value; })]);

var e = d3.scale.linear()
    .range([height, 0])
    .domain([0, 1/member_data.filter(function (d) {return d.founder}).length]);

var xAxis = d3.svg.axis()
    .scale(x)
    .tickSize(0)
    .tickPadding(12)
    .ticks(d3.time.years, 1)
    .orient("bottom");

var tAxis = d3.svg.axis()
    .scale(x)
    .tickSize(0)
    .tickPadding(junk.spacing/2*junk.width)
    .ticks(d3.time.years, 1)
    .orient("top");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .tickFormat(value_format);

var eAxis = d3.svg.axis()
    .scale(e)
    .orient("left")
    .tickFormat(equity_format);

var drag_time = d3.behavior.drag()
    .origin(function (d) {return {x: x(d.start_date), y:0}})
    .on("drag", change_member_date);

var drag = d3.behavior.drag()
    .origin(function (d) {return {x: x(d.issue_date), y: y(d.value)}})
    .on("drag", change_valuation);

// create the outer svg so we can create some <defs>
var outer_svg = d3.select("#viz").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", 3*(height + margin.top + margin.bottom));

// http://stackoverflow.com/a/14503863/564709
var valuation_nav = outer_svg.append("defs")
    .append("symbol")
    .attr("id", "valuation_nav");
valuation_nav.append("rect")
    .attr("x", junk.pad)
    .attr("y", junk.pad)
    .attr("width", junk.width)
    .attr("height", junk.height)
    .attr("ry", junk.ry)
    .attr("rx", junk.rx)
valuation_nav.append("line")
    .attr("x1", junk.pad + junk.xoff)
    .attr("x2", junk.pad + junk.width - junk.xoff)
    .attr("y1", junk.pad + junk.height/3)
    .attr("y2", junk.pad + junk.height/3);
valuation_nav.append("line")
    .attr("x1", junk.pad + junk.xoff)
    .attr("x2", junk.pad + junk.width - junk.xoff)
    .attr("y1", junk.pad + 2*junk.height/3)
    .attr("y2", junk.pad + 2*junk.height/3);

var time_nav = outer_svg.append("defs")
    .append("symbol")
    .attr("id", "time_nav");
time_nav.append("rect")
    .attr("x", junk.pad)
    .attr("y", junk.pad)
    .attr("width", junk.height)
    .attr("height", junk.width)
    .attr("ry", junk.rx)
    .attr("rx", junk.ry)
time_nav.append("line")
    .attr("y1", junk.pad + junk.xoff)
    .attr("y2", junk.pad + junk.width - junk.xoff)
    .attr("x1", junk.pad + junk.height/3)
    .attr("x2", junk.pad + junk.height/3);
time_nav.append("line")
    .attr("y1", junk.pad + junk.xoff)
    .attr("y2", junk.pad + junk.width - junk.xoff)
    .attr("x1", junk.pad + 2*junk.height/3)
    .attr("x2", junk.pad + 2*junk.height/3);


// create the member table part
var member_svg = outer_svg.append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

member_svg.selectAll(".member")
    .data(member_data).enter()
    .append("g")
    .each(add_member_row);

// add the add button
var y0=junk.width*junk.spacing*(member_data.length)+junk.width*(junk.spacing-1),
x0=-2*junk.width-junk.xoff,
w=junk.width-2*junk.xoff,
h=junk.height/3;
member_svg.append("g")
    .attr("id", "add_button")
    .attr("transform", "translate(0,"+y0+")")
    .append("rect")
    .attr("width",d3.max(x.range())-x0)
    .attr("height", junk.width)
    .attr("x",x0)
    .attr("y",0)
    .attr("rx", junk.rx);
member_svg.select("#add_button")
    .append("rect")
    .attr("class", "plus_sign")
    .attr("x", x0+junk.width-w/2)
    .attr("y", junk.width/2-h/2)
    .attr("rx", h/2)
    .attr("width", w)
    .attr("height", h)
member_svg.select("#add_button")
    .append("rect")
    .attr("class", "plus_sign")
    .attr("x", x0+junk.width-h/2)
    .attr("y", (junk.width-w)/2)
    .attr("rx", h/2)
    .attr("width", h)
    .attr("height", w)
member_svg.select("#add_button")
    .append("text")
    .attr("x", 0)
    .attr("y", junk.width*0.5)
    .attr("dy", "0.35em")
    .text("add a new member");
member_svg.select("#add_button")
    .on("click", add_member);

// add tooltips for the time nav
$(".time_nav").tipsy({
    gravity: 's',
    html: true,
    title: function () {
	return time_format(this.__data__.start_date);
    }
});

// create the liquidadtion proceeds part
var svg = outer_svg.append("g")
    .attr("id", "liquidation_proceeds")
    .attr("transform", "translate(" + margin.left + "," + (margin.top+junk.spacing*(member_data.length+2.5)*junk.width) + ")");

// create the x-axis and tweak the first and last labels accordingly
svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);
d3.select("g.x.axis g text")
    .text("founded");
d3.select(d3.selectAll("g.x.axis g text")[0].pop())
    .text("liquidation");

svg.append("g")
    .attr("class", "y axis")
    .call(yAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("dx", -6)
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text("Valuation");

// create the bars, bitches!
calculate_liquidation_bars_data();
var liquidation_bars = svg.selectAll(".series")
    .data(company_data).enter()
    .append("g")
    .attr("class", function (d) {
	var cls = "series"
	if (d.series === "liquidation") {
	    cls += " liquidation";
	}
	return cls;
    })
    .attr("transform", function (d) {
	return "translate("+(x(d.issue_date))+",0)";
    });

function bar_height (d) {
    return y(d.value_min) - y(d.value_max);
}
function bar_width (d) {
    return d.member_equity*d.series_share*x.rangeBand();
}
function bar_x (d) {
    return x.rangeBand()*d.series_share*(d.cumulative_member_equity-0.5);
}
function bar_y (d) {
    return y(d.value_max)
}
liquidation_bars.selectAll(".bar")
    .data(function(d) {return d.bars})
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("fill", function (d, i) {return color(d.member);})
    .attr("height", function (d){return bar_height(d)})
    .attr("width", function (d) {return bar_width(d)})
    .attr("x", function (d, i) {return bar_x(d)})
    .attr("y", function (d) {return bar_y(d)});

// create the tooltips for the liquidation bars
// http://bl.ocks.org/ilyabo/1373263
function bar_tooltip() {
    var d=this.__data__;
    var s = unit_format(d.units) + ' units worth<br/>';
    s += value_format((d.value_max-d.value_min)*d.member_equity*d.series_share);
    return s
}
$("rect.bar").tipsy({
    gravity: 'w',
    html: true,
    title: bar_tooltip
});

function proceeds_bar_height (d) {
    return bar_height(d);
}
function proceeds_bar_width (d) {
    return x.rangeBand();
}
function proceeds_bar_x (d) {
    return -x.rangeBand()/2+(x.rangeBand()-proceeds_bar_width(d))/2;
    //return (x.rangeBand() - proceeds_bar_width(d))/2;
}
function proceeds_bar_y (d) {
    return y(d.value_max);
}
liquidation_bars.selectAll(".proceeds_bar")
    .data(function (d) {return d.proceeds_bars})
    .enter()
    .append("rect")
    .attr("class", "proceeds_bar")
    .attr("fill", function (d) {return color(d.member)})
    .attr("height", function (d){return proceeds_bar_height(d)})
    .attr("width", function (d) {return proceeds_bar_width(d)})
    .attr("x", function (d, i) {return proceeds_bar_x(d)})
    .attr("y", function (d) {return proceeds_bar_y(d)});

// create the tooltips for the proceeds bars
// http://bl.ocks.org/ilyabo/1373263
function proceeds_bar_tooltip () {
    var d=this.__data__;
    return value_format(d.value_max-d.value_min);
}
$("rect.proceeds_bar").tipsy({
    gravity: 'w',
    html: true,
    title: proceeds_bar_tooltip
});

// Add dashed lines to signal value at each stage
svg.selectAll(".dashes.valuation")
    .data(company_data).enter()
    .append("line")
    .attr("class", function (d, i) {
	var c="dashes ";
	if (d.series === "liquidation") {
	    c += "liquidation";
	}
	else {
	    c += "valuation";
	}
	if (i===0) {
	    c += " noshow"
	}
	return c;
    })
    .attr("x1", function (d) {return d3.min(x.range());})
    .attr("x2", function (d) {
	if (d.series==="liquidation") {
	    return d3.max(x.range());
	}
	var t = company_data[company_data.length-2].issue_date;
	t = d3.time.month.offset(t, 6);
	return x(t);
    })
    .attr("y1", function (d) {return y(d.value);})
    .attr("y2", function (d) {return y(d.value);});

// add number of shares information
svg.selectAll(".label.units")
    .data(company_data).enter()
    .append("text")
    .attr("class", function (d) {
	var cls = "label units";
	if (d.series==="liquidation") {
	    cls += " liquidation";
	}
	return cls;
    })
    .attr("x", function (d) {return x(d.issue_date)})
    .attr("y", -5)
    .text(function (d) {
	if (d.total_units) {
	    return unit_format(d.total_units) + " units issued";
	}
	return unit_format(value2units(d.value)) + " units issued";
    });

// create the updn_controls
svg.selectAll(".updn_control")
    .data(company_data).enter()
    .append("use")
    .attr("class", function (d,i) {
	var c = "valuation_nav";
	if (i===0) {
	    c += " noshow";
	}
	return c;
    })
    .attr("xlink:href", "#valuation_nav")
    .attr("transform", "translate(0,"+(-junk.pad-junk.height/2)+")")
    .attr("y", function (d) {return y(d.value)})
    .attr("x", function (d) {return x(d3.time.month.offset(d.issue_date,-6))})
    .call(drag);

svg.selectAll(".back.label")
    .data(company_data).enter()
    .append("text")
    .attr("class", function (d, i) {
	var c="back label ";
	if (d.series === "liquidation") {
	    c += "liquidation";
	}
	else {
	    c += "valuation";
	}
	if (i===0) {
	    c += " noshow";
	}
	return c;
    })
    .attr("x", function (d) {return x(d.issue_date);})
    .attr("y", function (d) {return y(d.value);})
    .attr("dy", "0.45em")
    .text(function (d) {return value_format(d.value);});
svg.selectAll(".front.label")
    .data(company_data).enter()
    .append("text")
    .attr("class", function (d, i) {
	var c="front label ";
	if (d.series === "liquidation") {
	    c += "liquidation";
	}
	else {
	    c += "valuation";
	}
	if (i===0) {
	    c += " noshow";
	}
	return c;
    })
    .attr("x", function (d) {return x(d.issue_date);})
    .attr("y", function (d) {return y(d.value);})
    .attr("dy", "0.45em")
    .text(function (d) {return value_format(d.value);});



// add another chart to show equity as a function of time
var y0 = Number(d3.select("#liquidation_proceeds").attr("transform").split(",")[1].split(")")[0]) + d3.max(y.range()) + junk.spacing*junk.width*2.5;
var equity_svg = outer_svg.append("g")
    .attr("id", "equity")
    .attr("transform", "translate(" + margin.left + "," + y0 + ")");

// create the x-axis and tweak the first and last labels accordingly
equity_svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis);
equity_svg.select("g.x.axis g text")
    .text("founded");
d3.select(equity_svg.selectAll("g.x.axis g text")[0].pop())
    .text("liquidation");

// add the equity axis
equity_svg.append("g")
    .attr("class", "e axis")
    .call(eAxis)
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("dx", -6)
    .attr("y", 6)
    .attr("dy", ".71em")
    .style("text-anchor", "end")
    .text("Voting, Dividends, and Taxes");

// add the paths to show the member equity. use stairsteps to show
// step changes at the start of every year rather than showing
// something that appears continuous
function equity_line (datum, member) {

    // find the time point where equity becomes non-zero
    var I=null;
    datum.equity.forEach(function (d, i) {
	if (I===null && d>0) {
	    I=i;
	}
    })
    var s = 'M' + x(company_data[I].issue_date) + ',' + e(datum.equity[I]);
    datum.equity.forEach(function (d, i, a) {
	if (i>=I) {
	    if (i>0) {
		s += 'L' + x(company_data[i].issue_date) + ',' + e(a[i-1]);
	    }
	    s += "L" + x(company_data[i].issue_date) + ',' + e(d);
	}
	if (i===a.length-1) {
	    s += 'L' + x(d3.time.month.offset(company_data[i].issue_date, 6)) + ',' + e(d);
	}
    });
    return s;
}
var member_equity_lines = equity_svg.selectAll(".member.equity")
    .data(member_data).enter()
    .append("path")
    .attr("class", "member equity")
    .attr("stroke", function (d,i) {return color(i)})
    .attr("d", equity_line);

// add a line for 1/n equity to illustrate the time scale to becoming
// equal partners
function one_n_equity_line(_company_data, _i) {
    var s='M' + x(_company_data[0].issue_date) + ',' + e(1/_company_data[0].n_members);
    _company_data.forEach(function (d, i, a) {
	if (i>0 && i<a.length-1) {
	    s += 'L' + x(d.issue_date) + ',' + e(1/a[i-1].n_members);
	    s += 'L' + x(d.issue_date) + ',' + e(1/d.n_members);
	}
	else if (i===a.length-1) {
	    s += 'L' + x(d3.time.month.offset(d.issue_date, -6)) + ',' + e(1/d.n_members);
	}
    });
    return s;
}
var one_n_equity_lines = equity_svg.append("path")
    .attr("class", "one_n equity")
    .datum(company_data)
    .attr("d", one_n_equity_line);

// get the current value of the input and change the visual
// accordingly. helpful links:
// http://stackoverflow.com/a/222767/564709
// https://groups.google.com/forum/?fromgroups=#!topic/d3-js/TtSWZo4x0QI
function change_valuation(datum, index) {

    // all data is bound as pass by reference, so changing the value
    // in the original data object passes this information along to
    // all other functions
    var v = Number(y.invert(d3.event.y));
    var vmin = d3.min(y.domain());
    var vmax = d3.max(y.domain());
    if (v<vmin) {
	v = vmin+0.0001; // epsilon to avoid NaN problems
    }
    else if (v>vmax) {
	v = vmax;
    }
    company_data[index].value = v;
    
    // recalculate number of units for each member and the liquidation
    // bars data
    calculate_member_units();
    calculate_liquidation_bars_data();

    // update the horizontal dashed lines
    var cls = "valuation";
    if (datum.series === "liquidation") {
	cls = "liquidation";
    }
    svg.selectAll(".dashes."+cls)
    	.attr("y1", function (d) {return y(d.value);})
    	.attr("y2", function (d) {return y(d.value);});
    
    // update the valuation labels
    svg.selectAll(".label."+cls)
	.attr("y", function (d) {return y(d.value);})
	.text(function (d) {return value_format(d.value);});
    
    // update the liquidation bars
    liquidation_bars.selectAll(".bar")
	.attr("height", function (d){return bar_height(d)})
	.attr("width", function (d) {return bar_width(d)})
	.attr("x", function (d, i) {return bar_x(d)})
	.attr("y", function (d) {return bar_y(d)});

    // update the total liquidation proceeds
    liquidation_bars.selectAll(".proceeds_bar")
	.attr("height", function (d){return proceeds_bar_height(d)})
	.attr("width", function (d) {return proceeds_bar_width(d)})
	.attr("x", function (d, i) {return proceeds_bar_x(d)})
	.attr("y", function (d) {return proceeds_bar_y(d)});

    // update the equity plot
    equity_svg.selectAll(".member.equity")
	.attr("d", equity_line);
    
    // update position of the drag control
    d3.select(this)
	.attr("y", function (d) {return y(d.value)});

    // add number of shares information
    svg.selectAll(".label.units")
	.text(function (d, i) {
	    if (d.total_units) {
		return unit_format(d.total_units) + " units issued";
	    }
	    return unit_format(value2units(d.value)) + " units issued";
	});

    return false;
};

function change_member_date(datum) { 

    // all data is bound as pass by reference, so changing the value
    // in the original data object pass this information along to all
    // other functions
    var v = new Date(x.invert(d3.event.x));
    var vmin = d3.min(x.domain());
    var vmax = d3.max(x.domain());
    if (v<vmin) {
	v = vmin;
    }
    else if (v>vmax) {
	v = vmax;
    }
    datum.start_date = v;

    // recalculate number of units for each member
    calculate_member_units();
    calculate_liquidation_bars_data();

    // update the liquidation bars
    liquidation_bars.selectAll(".bar")
	.attr("height", function (d){return bar_height(d)})
	.attr("width", function (d) {return bar_width(d)})
	.attr("x", function (d, i) {return bar_x(d)})
	.attr("y", function (d) {return bar_y(d)});
    
    // update the total liquidation proceeds
    liquidation_bars.selectAll(".proceeds_bar")
	.attr("height", function (d){return proceeds_bar_height(d)})
	.attr("width", function (d) {return proceeds_bar_width(d)})
	.attr("x", function (d, i) {return proceeds_bar_x(d)})
	.attr("y", function (d) {return proceeds_bar_y(d)});

    // update position of the drag control
    d3.select(this)
	.attr("x", x(datum.start_date)-junk.height/2-junk.pad);

    // update the equity plot
    equity_svg.selectAll(".member.equity")
	.attr("d", equity_line);
    
    // update the 1/n on the equity plot
    equity_svg.selectAll(".one_n.equity")
	.attr("d", one_n_equity_line);
	
    return false;
}

function add_member_row(d, i) {

    // set the class to be member
    d3.select(this)
	.attr("class", "member");

    // add a color backing
    d3.select(this)
	.append("rect")
	.attr("x", -2*junk.width-junk.xoff)
	.attr("y", junk.width*junk.spacing*i + junk.width*(junk.spacing-1)/2)
	.attr("height", junk.width)
	.attr("width", 2*junk.width)
	.attr("rx", junk.rx)
	.attr("stroke", "black")
	.attr("stroke-width", 1)
	.attr("fill", color(i));

    // add a label with backing
    d3.select(this)
	.append("text")
	.attr("class", "label back")
	.attr("x", -junk.width-junk.xoff)
	.attr("y", junk.width*junk.spacing*(i+0.5))
	.attr("dy", "0.35em")
	.text(d.founder ? d.name + " *" : d.name);
    d3.select(this)
	.append("text")
	.attr("class", "label front")
	.attr("x", -junk.width-junk.xoff)
	.attr("y", junk.width*junk.spacing*(i+0.5))
	.attr("dy", "0.35em")
	.text(d.founder ? d.name + " *" : d.name);

    d3.select(this)
	.append("g")
	.attr("class", "t axis")
	.classed("show", i===0)
	.attr("transform", "translate(0,"+(junk.width*junk.spacing*(i+0.5))+")")
	.call(tAxis);

    // add sliders
    d3.select(this).select("g.t.axis")
	.append("use")
	.attr("class", "time_nav")
	.attr("xlink:href", "#time_nav")
	.attr("transform", "translate(0,"+(-junk.pad-junk.width/2)+")")
	.attr("x", function (d) {return x(d.start_date)-junk.height/2-junk.pad})
	.attr("y", 0)
	.call(drag_time);

}

function add_member() {

    // add new element to the member_data array and update the
    // relevant data structures
    member_data.push({
	"start_date": d3.max(member_data.map(function (d) {return d.start_date})),
	"founder": false,
	"units": [],
	"equity": [],
	"name": fake_names[member_data.length],
    });
    calculate_member_units();
    calculate_liquidation_bars_data(true);

    member_svg.selectAll(".member")
	.data(member_data).enter()
	.insert("g", "#add_button")
	.attr("stroke-opacity", 0)
	.attr("fill-opacity", 0)
	.transition().delay(100)
	.attr("stroke-opacity", 1)
	.attr("fill-opacity", 1)
	.each(add_member_row);

    // add the liquidation bars for the new member (the first one adds
    // the new rects. the second selection places everything)
    liquidation_bars.selectAll(".bar")
    	.data(function(d) {return d.bars}).enter()
    	.append("rect")
    	.attr("class", "bar");
    liquidation_bars.selectAll(".bar")
    	.attr("fill", function (d, i) {return color(d.member);})
    	.attr("height", function (d){return bar_height(d)})
    	.attr("width", function (d) {return bar_width(d)})
    	.attr("x", function (d, i) {return bar_x(d)})
    	.attr("y", function (d) {return bar_y(d)});

    // add the proceeds bars for the new member (fist one addes the
    // new rect. the second selection places everything)
    liquidation_bars.selectAll(".proceeds_bar")
    	.data(function (d) {return d.proceeds_bars})
    	.enter()
    	.append("rect")
    	.attr("class", "proceeds_bar");
    liquidation_bars.selectAll(".proceeds_bar")
    	.attr("fill", function (d, i) {return color(d.member);})
    	.attr("height", function (d){return proceeds_bar_height(d)})
    	.attr("width", function (d) {return proceeds_bar_width(d)})
    	.attr("x", function (d, i) {return proceeds_bar_x(d)})
    	.attr("y", function (d, i) {return proceeds_bar_y(d)});
    
    // add tooltips
    $("rect.bar").tipsy({
	gravity: 'w',
	html: true,
	title: bar_tooltip
    });
    $("rect.proceeds_bar").tipsy({
	gravity: 'w',
	html: true,
	title: proceeds_bar_tooltip
    });

    // add the equity line for this member
    equity_svg.selectAll(".member.equity")
	.data(member_data).enter()
	.append("path")
	.attr("class", "member equity")
	.attr("stroke", function (d,i) {return color(i)});
    equity_svg.selectAll(".member.equity")
	.attr("d", equity_line);

    // update the 1/n equity line
    equity_svg.selectAll(".one_n.equity")
	.attr("d", one_n_equity_line);

    // move the add button down
    var transform = member_svg.select("#add_button").attr("transform");
    var y0 = Number(transform.split(",")[1].split(")")[0]);
    if (member_data.length < fake_names.length) {
	member_svg.select("#add_button")
	    .transition()
	    .attr("transform", "translate(0,"+(y0+junk.width*junk.spacing)+")");

	// move the liquidation proceeds chart down
	transform = d3.select("#liquidation_proceeds")
	    .attr("transform").split(",");
	y0 = Number(transform[1].split(")")[0]) + junk.spacing*junk.width;
	transform[1] = y0 + ")";
	d3.select("#liquidation_proceeds")
	    .transition()
	    .attr("transform", transform.join(","));

    } else {
	member_svg.select("#add_button")
	    .transition()
	    .attr("fill-opacity", 0)
	    .attr("stroke-opacity", 0)
	    .delay(0)
	    .style("display", "none");
    }


    return false;
}

