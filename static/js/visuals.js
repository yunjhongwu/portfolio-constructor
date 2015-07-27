         function quote() {
            // Click "Quote" to freeze positions, pull data, and fit a model.
            $("#loading").show();

            startdate = $.datepicker.formatDate("yy-mm-dd",
                $("#start-date").datepicker("getDate"));
            enddate = $.datepicker.formatDate("yy-mm-dd",
                $("#end-date").datepicker("getDate"));
            symbols = $("#symbols").children().map(
                    function() {
                        return this.value;
                    })
                .toArray();

            data["Currency"] = {
                series: [],
                ret: parseFloat($("#rate").val()),
                vol: 0
            };
            var v = 1;
            var rate = Math.pow(1 + $("#rate").val() / 100, 0.0027);
            for (var d = $("#start-date").datepicker("getDate"); d <= $("#end-date").datepicker("getDate"); d.setDate(d.getDate() + 1)) {
                data["Currency"].series.push({
                    date: new Date(d.getTime()),
                    value: v
                });
                v *= rate;
            }
            data["Currency"].min = Math.min(1, v);
            data["Currency"].max = Math.max(1, v);

            var quotes = symbols.map(function(symbol) {
                return $.post("_pull", {
                    symbol: symbol,
                    startdate: startdate,
                    enddate: enddate
                }, function(d) {
                    if (d === "invalid")
                        invalidSymbol(symbol);
                    else {
                        d3.select("#progress").text("Pulling data...(" + symbol + ")");

                        data[symbol] = JSON.parse(d.series);
                        data[symbol] = {
                            series: Object.keys(data[symbol])
                                .map(function(key) {
                                    return data[symbol][key];
                                }),
                            ret: d.ret,
                            vol: d.vol
                        };

                        data[symbol].series.forEach(function(d) {
                            d.date = dateFormat.parse(d.date);
                        });
                        var extrema = d3.extent(
                            data[symbol].series.map(
                                function(d) {
                                    return d.value;
                                }));
                        data[symbol].min = extrema[0];
                        data[symbol].max = extrema[1];


                    }
                });
            });


            $.when.apply(null, quotes).done(function() {
                d3.select("#progress").text("Processing data...");
                symbols.push("Currency");
                fit(true);
            });
        }

        function trendPlot() {
            // Initialize layout based on positions, called only when clicking "Quote"
            xticks.domain([$("#start-date").datepicker("getDate"),
                           $("#end-date").datepicker("getDate")]);
            updateTitle(svgtrend.append("text").attr("id", "title")
                                  .attr("x", width / 2 - 40)
                                   .attr("y", -20)
                                   .style("text-decoration", "underline"),
                                   "Total returns");
           svgtrend.append("text").attr("id", "subtitle")
                                  .attr("x", width / 2 - 90)
                                  .attr("font-size", "12px");


        
            svgtrend.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis);

            svgtrend.append("g")
                .attr("class", "y axis")
                .append("text")
                .attr("x", -height / 2 - 25)
                .attr("y", -30)
                .attr("transform", "rotate(-90)")
                .text("Total returns");

            svgtrend.append("g")
                .attr("id", "trendlines")
                .selectAll(".line")
                .data(symbols.map(function(s) {
                    return {
                        symbol: s,
                        series: data[s].series
                    };
                }), function(d) {
                    return d.symbol;
                })
                .enter().append("path")
                .attr("id", function(d) {
                    return "line-" + d.symbol;
                })
                .attr("class", "line")
                .attr("stroke", function(d, i) {
                    return colors(d.symbol);
                })
                .attr("stroke-width", 2)
                .attr("opacity", 0.3)
                .on("mouseover", highlight)
                .on("mouseout", unhighlight);

            svgtrend.select("#trendlines").append("path")
                .attr("id", "line-pos")
                .attr("class", "pos");

            svgtrend.select("#trendlines").append("path")
                .attr("id", "line-rebalancing")
                .attr("class", "pos")
                .attr("opacity", 0.4);

            var gpie = svgpie.selectAll(".arc")
                .data(pie(symbols.map(function(s) {
                    return {
                        symbol: s,
                        p: 1
                    };
                })), function(d) {
                    return d.data.symbol;
                })
                .enter().append("g")
                .attr("class", "arc")
                .attr("id", function(d) {
                    return "pie-" + d.data.symbol;
                })
                .attr("transform", "scale(1)")
                .on("mouseover", function(d) {
                    highlight(d.data);
                })
                .on("mouseout", function(d) {
                    unhighlight(d.data);
                });

            gpie.append("path")
                .style("fill", function(d, i) {
                    return colors(d.data.symbol);
                })
                .attr("visibility", function(d) {
                    return (d.value === 0) ? "hidden" : "visible";
                })
                .each(function(d) {
                    this.current = d;
                });

            var gpietext = svgpie.selectAll(".pietext")
                .data(pie(symbols.map(function(s) {
                    return {
                        symbol: s,
                        p: 1
                    };
                })), function(d) {
                    return d.data.symbol;
                })
                .enter().append("g")
                .attr("id", function(d) {
                    return "pietext-" + d.data.symbol;
                })
                .attr("class", "pietext")
                .attr("transform", "scale(1)");

            gpietext.append("path")
                .attr("visibility", "hidden");

            gpietext.append("text")
                .style("text-anchor", "middle");

            svgpie.append("g").attr("id", "info").selectAll("text")
                .data(["Annualized return:, ", "Volatility: "]).enter()
                .append("text")
                .attr("x", -200)
                .attr("y", function(d, i) {
                    return 230 + 20 * i;
                });
            updatePlots();
        }


        function updatePlots() {
            // Plot data
            var selected = getSelectedSymbols();

            yticks.domain([d3.min(selected.map(function(s) {
                    return data[s].min;
                })), Math.max(Math.max(pos.max, rbperf.max),
                d3.max(selected.map(function(s) {
                    return data[s].max;
                })))]);

            svgtrend.select("g.y.axis")
                .call(yAxis);

            svgtrend.select("#trendlines")
                .selectAll(".line")
                .data(symbols.map(function(s) {
                    return {
                        symbol: s,
                        series: data[s].series,
                    };
                }), function(d) {
                    return d.symbol;
                }).transition().duration(300)
                .attr("d", function(d) {
                    return getLine(d.series);
                })
                .style("visibility", function(d, i) {
                    return ((d.symbol === "Currency") ? $("#Currency") :
                        $("#symbols option[value=" + d.symbol + "]")).is(":checked") ? "visible" : "hidden";
                });

            svgtrend.selectAll("#line-pos, #line-rebalancing")
                .transition().duration(400)
                .attr("d", getLine(pos.series));


            var newpie = svgpie.selectAll(".arc")
                .data(pie(pos.L).concat(pie(pos.S)),
                        function(d) { return d.data.symbol; });

            newpie.select("path")
                .transition().duration(600).attrTween("d", arcTween);
            
            svgpie.selectAll(".pietext")
                .data(newpie.data(), function(d) { return d.data.symbol; })
                .select("text")
                .attr("visibility", function(d) {
                    return (d.value === 0) ? "hidden" : "visible";
                })
                .attr("transform", function(d) {
                    return "translate(" + ((d.value < 0) ? arcshor : arclong).centroid(d) + ")";
                })
                .attr("opacity", 0).transition().duration(600).attr("opacity", 1)
                .text(function(d) { return d.data.symbol + " " + (d.data.p * 100).toFixed(1) + "%"; });

            svgpie.select("#info").selectAll("text")
                .data(["Annualized return: " + pos.ret.toFixed(1) + "%",
                    "Volatility: " + pos.vol.toFixed(1) + "%"])
                .text(function(d) {
                    return d;
                });

            function arcTween(d) {
                var intermediate = d3.interpolate(this.current, d);
                this.current = intermediate(0);
                return function(i) {
                    return ((d.value < 0) ? arcshor : arclong)(intermediate(i));
                };
            }
        }

        function updateTitle(title, text) {
            // Update titles of trend plots
            var box = title.text(text).node().getBBox();
            title.attr("x", (width - box.width) / 2);
        }

        function highlight(d) {
            // Mouseover a position
            updateTitle(svgtrend.select("#title"), 
                        "Total return: " + d.symbol);
            updateTitle(svgtrend.select("#subtitle"), 
                        "Annualized return: " 
                        + data[d.symbol].ret.toFixed(1) + "%, Volatility: " 
                        + data[d.symbol].vol.toFixed(1) + "%");

            svgtrend.select("#line-" + d.symbol)
                .attr("opacity", 1)
                .attr("stroke-width", 3);

            var slices = svgpie.select("#pie-" + d.symbol + ", #pietext-" + d.symbol);
            if ($.browser.chrome || animation)
                slices = slices.transition().duration(400);
            slices.attr("transform", "scale(1.2)");
        }

        function unhighlight(d) {
            // Mouseout a position
            svgtrend.select("#line-" + d.symbol)
                .attr("opacity", 0.4)
                .attr("stroke-width", 2);
            var slices = svgpie.select("#pie-" + d.symbol + ", #pietext-" + d.symbol);
            if ($.browser.chrome || animation)
                slices = slices.transition().duration(400);
            slices.attr("transform", "scale(1)");



        }

        function getSelectedSymbols() {
            var s = $("#symbols").val();
            if ($("#Currency").is(":checked"))
                s.push("Currency");
            return s;
        }
 


        function fit(init) {
            // Fit model and plot, init for the first call
            var dataSubset = new Object;
            var unused = [];
            $("#symbols option").each(function(i, option) {
                if ($(option).is(":checked"))
                    dataSubset[option.value] = data[option.value].series;
                else
                    unused.push(option.value);
            });
            if ($("#Currency").is(":checked"))
                dataSubset["Currency"] = data["Currency"].series;
            else
                unused.push("Currency");
            $.post("_fit", {
                data: JSON.stringify(dataSubset),
                risk: $("#risk").val(),
                unused: unused.join(","),
                shor: $("#shor").is(":checked"),
                l2: $("#l2").val()
            }, function(d) {
                pos = d;
                pos.series = JSON.parse(pos.series);
                pos.series = Object.keys(pos.series).map(function(key) {
                    return {
                        date: dateFormat.parse(pos.series[key].date),
                        value: pos.series[key].value
                    };
                });
                rbperf = pos;

                if (init) {
                    getFrontier();
                    trendPlot();
                }
                else {
                updatePlots();
                savePos();
                }

                $("#loading").fadeOut();
            });

        }

        function savePos() {
            // Save a portfolio
            var profile = { symbols: getSelectedSymbols(), 
                            risk: parseFloat($("#risk").val()),
                            l2: parseFloat($("#l2").val())
                          };
            profile.tag = JSON.stringify(profile);
            profile.ret = pos.ret;
            profile.vol = pos.vol;
            svgfro.selectAll("circle")
                .data([profile], function(d) { return d.tag; }).enter()
                .append("circle")
                .attr("class", "profile")
                .attr("r", 4)
                .attr("cx", function(d) { return fxticks(d.vol); })
                .attr("cy", function(d) { return fyticks(d.ret); })
                .on("click", function(d) {
                        $("#symbols").val(d.symbols)
                                     .multiselect("refresh");
                        $("#Currency").prop("checked", d.symbols[d.symbols.length-1] === "Currency") 
                        $("#risk").val(d.risk);
                        $("#l2").val(d.l2);
                        fit(false);
                        });

        }

        function getFrontier() {
            // Initialize efficient frontier
            var dataSubset = { "Currency": data["Currency"].series };
            symbols.forEach(function(symbol) {
                dataSubset[symbol] = data[symbol].series;
            });
    
            $.post("_frontier", {
                data: JSON.stringify(dataSubset),
                shor: $("#shor").is(":checked"),
            }, function(frontier) {
                var ef = Object.keys(frontier).map(function(k) {
                    return frontier[k];
                });

                var maxVol = d3.max(ef, function(d) {
                    return d.vol;
                });
                var maxRet = d3.max(ef, function(d) {
                    return d.ret;
                });
                fxticks.domain([0, maxVol]);
                fyticks.domain([0, maxRet]);
                svgfro.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + height + ")")
                .call(fxAxis)
                .append("text").attr("x", width / 2).attr("y", 25).text("Volatility");

               svgfro.append("text").attr("x", width / 2 - 50).attr("y", -20).text("Efficient frontier");

               svgfro.append("g")
                .attr("class", "y axis")
                .call(fyAxis)
                .append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", -height / 2 - 40)
                .attr("y", -25)
                .text("Annualized return");

                svgfro.append("path")
                    .attr("class", "frontier-area")
                    .attr("fill", "url(#frontierArea)")
                    .attr("d", getFrontierLine(ef));


                svgfro.append("linearGradient")
                    .attr("id", "frontierArea")
                    .attr("gradientUnits", "userSpaceOnUse")
                    .attr("x1", 0).attr("y1", fyticks(maxRet) / 2)
                    .attr("x2", fxticks(maxVol)).attr("y2", fyticks(maxRet))
                    .selectAll("stop")
                    .data([
                      { offset: "20%", color: "blue", opacity: 0.8 },
                      { offset: "100%", color: "red", opacity: 0 }
                    ])
                    .enter().append("stop")
                    .attr("offset", function(d) { return d.offset; })
                    .attr("stop-color", function(d) { return d.color; })
                    .attr("stop-opacity", function(d) { return d.opacity; });

                savePos();
            });

        }

        function rebalancing(rbfreq) {
            // Get performance with rebalancing
            var dataSubset = new Object;
            var p = pos.L.concat(pos.S);
            p.forEach(function(pos) {
                dataSubset[pos.symbol] = data[pos.symbol].series;
            });


            $.post("_rebalancing", {
                data: JSON.stringify(dataSubset),
                pos: JSON.stringify(p),
                rbfreq: rbfreq
                }, function(rbperf) {
                rbperf.series = JSON.parse(rbperf.series);
                rbperf.series = Object.keys(rbperf.series).map(function(key) {
                    return {
                        date: dateFormat.parse(rbperf.series[key].date),
                        value: rbperf.series[key].value
                    };
                });

                svgtrend
                    .select("#line-rebalancing").attr("visibility", "visible")
                    .transition().duration(400)
                    .attr("d", getLine(rbperf.series));

                svgpie.select("#info text")
                      .html("Annualized return: " + pos.ret.toFixed(1) 
                            + "% (" + ((pos.ret <= rbperf.ret) ? "+" : "") 
                            + (rbperf.ret - pos.ret).toFixed(1) 
                            + "% by " + $("#rebalancing option[value=" + rbfreq + "]").text().toLowerCase()
                            + " rebalancing)");
            });

        }
