// Global variables
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

// Initialize visuals
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


//Initialize panel

$(function() {
    var date = new Date;
    $("#end-date").attr("value", $.datepicker.formatDate("mm/dd/yy", date));
    date.setMonth(date.getMonth() - 1);
    $("#start-date").attr("value", $.datepicker.formatDate("mm/dd/yy", date));
    $("#start-date").datepicker({
        dataFormat: "mm/dd/yy",
        changeMonth: true,
        defaultDate: $("#start-date").attr("value"),
        maxDate: $("#start-date").attr("value"),
        onClose: function() {
            var date = $("#start-date").datepicker("getDate");
            date.setMonth(date.getMonth() + 1);
            $("#end-date").datepicker("option", "minDate", date);
        }
    });

    $("#end-date").datepicker({
        dataFormat: "mm/dd/yy",
        changeMonth: true,
        defaultDate: $("#end-date").attr("value"),
        maxDate: new Date,
        onClose: function() {
            var date = $("#end-date").datepicker("getDate");
            date.setMonth(date.getMonth() - 1);
            $("#start-date").datepicker("option", "maxDate", date);
        }
    });

    $("#ticker").on("keypress", function(key) {
        if (key.which === 13) {
            var ticker = this.value.toUpperCase();
            if (!$("#symbols").children("option[value=" + ticker + "]").length) {
                $("#symbols").append(new Option(ticker, ticker, true, true));
                $("#symbols").multiselect("refresh");
            } else
                alert("Ticker " + ticker + " has been added.");
            this.value = "";
        }
    });

    $("#symbols").multiselect({
        click: function(event, option) {
            svgtrend.select("#line-" + option.value).style("visibility", option.checked ? "visible" : "hidden");
        },
        checkAll: updatePlots,
        uncheckAll: function() {
            svgtrend.selectAll(".line").style("visibility", "hidden");
        }
    });

    $.get("data/init_symbols").done(function(tickers) {
        var multiselect = $("#symbols");
        tickers.toUpperCase().split('\n')
            .forEach(function(ticker) {
                if (ticker.length)
                    multiselect.append(new Option(ticker, ticker, true, true));
            });
        $(".multiselect").multiselect({
            minWidth: 120
        });
        $("#symbols").multiselect("refresh");
    });

    $("#Currency").click(function() {
        svgtrend.select("#line-Currency").style("visibility", this.checked ? "visible" : "hidden")
    })


    $("#rebalancing")
        .change(function() {
            if (this.value > 0)
                rebalancing(this.value);
            else {
                svgtrend
                    .select("#line-rebalancing").attr("visibility", "visible")
                    .transition().duration(400)
                    .attr("d", getLine(pos.series));
                svgpie.select("#info text")
                    .text("Annualized return: " + pos.ret.toFixed(1) + "%");
            }

        });

    $("#quote")
        .button().click(function(event) {
            event.preventDefault();
            if ($("#symbols").val() !== null && $("#symbols").val().length + $("#Currency").is(":checked") > 1) {
                if (this.value === "Quote") {
                    quote();
                    $("input[type=text]").attr("disabled", "disabled");
                    $("input#rate").attr("disabled", "disabled");
                    $("input#shor").attr("disabled", "disabled");
                    $("select#rebalancing").prop("disabled", false);
                    $("#quote").attr("value", "Fit");
                } else {
                    $("select#rebalancing").val(0);
                    fit(false);
                }
            } else
                alert("Please select at least two stocks or one stock and cash.");

        });

    $("#reset")
        .button().click(function(event) {
            event.preventDefault();
            d3.select("#progress").text("Pulling data...");
            $("input[type=text]").prop("disabled", false);
            $("input#shor").prop("disabled", false);
            $("input#rate").prop("disabled", false);
            $("select#rebalancing").prop("disabled", true)
            $("#quote").attr("value", "Quote");
            $("#symbols").empty().multiselect("refresh");
            data = new Object;
            d3.selectAll("g").html("");

        });

    $(".ui-widget").css("font-size", "12px");

});
