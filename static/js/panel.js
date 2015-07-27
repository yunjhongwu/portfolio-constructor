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

        $("#rebalancing").change(function() {
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

      $(".ui-widget").css("font-size", "12px");

    });


    function invalidSymbol(symbol) {
        $("#symbols option[value=" + symbol + "]").remove();
        $("#symbols").multiselect("refresh");
        alert("Invalid ticker: " + symbol +
            ": the ticker may not exist or data is corrupted in the specified time period.");
    }
