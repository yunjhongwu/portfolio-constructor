var data = new Object;
var pos, rbperf;
var startdate, enddate;
var dateFormat = d3.time.format("%Y-%m-%d");
var colors = d3.scale.category10();

var svgtrend, svgfro, svgpie;
var width, height;
var xticks, yticks, fxticks, fyticks;
var xAxis, yAxis, fxAxis, fyAxis;
var getLine, getFrontierLine;
var pie;
var arclong, arcshor;
var animation = false;

$(function() {
    d3.selectAll(".plot")
        .append("svg")
        .attr("class", "svg")
        .append("g")
        .attr("transform", "translate(80, 50)");

    svgtrend = d3.select("#trend-plot").select("g");
    svgfro = d3.select("#frontier-plot").select("g");
    svgpie = d3.select("#piechart")
        .append("svg")
        .attr("id", "svgpie")
        .append("g")
        .attr("transform", "translate(220, 210)");

    width = parseInt(d3.select(".svg").style("width")) - 100;
    height = parseInt(d3.select(".svg").style("height")) - 100;
    xticks = d3.time.scale().range([0, width]);
    yticks = d3.scale.linear().range([height, 0]);
    fxticks = d3.scale.pow().exponent(2).range([0, width]);
    fyticks = d3.scale.linear().range([height, 0]);
    xAxis = d3.svg.axis().scale(xticks).orient("bottom").ticks(5);
    yAxis = d3.svg.axis().scale(yticks).orient("left").ticks(5);
    fxAxis = d3.svg.axis().scale(fxticks).orient("bottom")
        .tickPadding(8)
        .innerTickSize(-height).ticks(5);
    fyAxis = d3.svg.axis().scale(fyticks).orient("left").ticks(5)
        .tickPadding(8)
        .innerTickSize(-width).ticks(5);


    getLine = d3.svg.line().x(function(d) {
            return xticks(d.date);
        })
        .y(function(d) {
            return yticks(d.value);
        });

    getFrontierLine = d3.svg.line()
        .x(function(d) {
            return fxticks(d.vol);
        })
        .y(function(d) {
            return fyticks(d.ret);
        });

    pie = d3.layout.pie()
        .sort(null)
        .value(function(d) {
            return d.p;
        });

    arclong = d3.svg.arc()
        .outerRadius(150)
        .innerRadius(100);

    arcshor = d3.svg.arc()
        .outerRadius(80)
        .innerRadius(0);

});
