$(document).ready(loadHtml.bind(this, true));

function loadHtml(isStartPage = false) {
    var data = JSON.parse(sessionStorage.getItem("oltStatus"));

    if (!data) {
        $("#root").prepend(getHtmlEmpty());
        return;
    }    

    $("#root").prepend(getHtmlChart());
    drawChart(prepareData(data));
}

function getHtmlEmpty() {
    let htmlEmpty = `
    <div class="card flex-fill w-100">
        <div class="card-header">
            <h5 class="card-title">Необходимо открыть страницу мониторинга для обновления данных.</h5>            
        </div>        
    </div>`;
    return htmlEmpty;
}

function getHtmlChart() {
    let htmlChart = `
    <div class="card flex-fill w-100">
        <div class="card-header">
            <h5 class="card-title">ONU's RX Power Chart</h5>
            <h6 class="card-subtitle text-muted">Большее значение означает более худший rx сигнал.</h6>
        </div>
        <div class="card-body">
            <div class="chart"><div class="chartjs-size-monitor"><div class="chartjs-size-monitor-expand"><div class=""></div></div><div class="chartjs-size-monitor-shrink"><div class=""></div></div></div>
                <canvas id="chartjs-line" style="display: block; height: 3500px; width: 385px;" width="601" height="468" class="chartjs-render-monitor"></canvas>
            </div>
        </div>
    </div>`;
    return htmlChart;
}

function prepareData(data) {
    let signals = [];
    for (let olt of data.olts) {
        for (let port of olt.ports) {
            for (let onu of port.onus) {
                if (!onu.rxPower) continue;
                signals.push({
                    name: `[${onu.macShort}] ${onu.name}`,
                    value: -onu.rxPower,
                });
            }
        }
    }
    return signals.sort((a, b) => { return b.value - a.value });
}

function drawChart(onus) {
    $(function () {
        // Line chart
        let labels = [];
        let data = [];

        for (let onu of onus) {
            labels.push(onu.name);
            data.push(onu.value);
        }

        new Chart(document.getElementById("chartjs-line"), {
            type: "horizontalBar",
            data: {
                labels: labels,
                datasets: [                    
                    {
                        label: "Rx Power (-dbm)",
                        fill: true,
                        //backgroundColor: "transparent",
                        backgroundColor: window.theme.primary,
                        borderColor: window.theme.tertiary,
                        borderDash: [4, 4],
                        data: data,
                    },
                ],
            },
            options: {
                maintainAspectRatio: false,
                legend: {
                    display: false,
                },
                tooltips: {
                    intersect: false,
                },
                hover: {
                    intersect: true,
                },
                plugins: {
                    filler: {
                        propagate: false,
                    },
                },
                scales: {
                    xAxes: [
                        {
                            reverse: true,
                            gridLines: {
                                color: "rgba(0,0,0,0.05)",
                            },
                        },
                    ],
                    yAxes: [
                        {
                            ticks: {
                                stepSize: 500,
                            },
                            display: true,
                            borderDash: [5, 5],
                            gridLines: {
                                color: "rgba(0,0,0,0)",
                                fontColor: "#fff",
                            },
                        },
                    ],
                },
            },
        });
    });
}
