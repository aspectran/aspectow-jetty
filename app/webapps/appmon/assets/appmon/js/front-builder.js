function FrontBuilder() {

    const domains = [];
    const instances = [];
    const viewers = [];
    const clients = [];

    this.build = function (basePath, token, specificInstances) {
        clearView();
        $.ajax({
            url: basePath + "/backend/" + token + "/config",
            type: "get",
            dataType: "json",
            data: {
                instances: specificInstances
            },
            success: function (data) {
                if (data) {
                    domains.length = 0;
                    instances.length = 0;
                    viewers.length = 0;
                    clients.length = 0;
                    let index = 0;
                    let random1000 = random(1, 1000);
                    for (let key in data.domains) {
                        let domain = data.domains[key];
                        domain['index'] = index++;
                        domain['random1000'] = random1000;
                        domain['active'] = true;
                        domain.endpoint['token'] = data.token;
                        domain['client'] = {
                            established: false,
                            establishCount: 0
                        };
                        domains.push(domain);
                        viewers[domain.index] = new FrontViewer();
                        console.log("domain", domain);
                    }
                    for (let key in data.instances) {
                        let instance = data.instances[key];
                        instance['active'] = false;
                        instances.push(instance);
                        console.log("instance", instance);
                    }
                    buildView();
                    bindEvents();
                    if (domains.length) {
                        establish(0, specificInstances);
                    }
                }
            }
        });
    };

    const random = function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const establish = function (domainIndex, specificInstances) {
        function onJoined(domain, payload) {
            clearConsole(domain.index);
            if (payload) {
                for (let key in payload.messages) {
                    let msg = payload.messages[key];
                    viewers[domain.index].processMessage(msg);
                }
            }
        }
        function onEstablished(domain) {
            domain.client.established = true;
            domain.client.establishCount++;
            console.log(domain.name, "connection established:", domain.client.establishCount);
            console.log(domain.name, "endpoint mode:", domain.endpoint.mode)
            changeDomainState(domain);
            if (domain.active) {
                viewers[domain.index].setVisible(true);
            }
            if (domain.client.establishCount === 1) {
                console.log(domain.name, "init view");
                initView();
            } else {
                console.log(domain.name, "clear sessions");
                clearSessions(domain.index);
            }
            if (domain.client.establishCount + domain.index < domains.length) {
                establish(domain.index + 1, specificInstances);
            }
        }
        function onClosed(domain) {
            domain.client.established = false;
            changeDomainState(domain);
        }
        function onFailed(domain) {
            changeDomainState(domain, true);
            if (domain.endpoint.mode !== "websocket") {
                setTimeout(function () {
                    let client = new PollingClient(domain, viewers[domain.index], onJoined, onEstablished, onClosed, onFailed);
                    clients[domain.index] = client;
                    client.start(specificInstances);
                }, (domain.index - 1) * 1000);
            }
        }

        console.log("establishing", domainIndex);
        let domain = domains[domainIndex];
        let viewer = viewers[domainIndex];
        let client;
        if (domain.endpoint.mode === "polling") {
            client = new PollingClient(domain, viewer, onJoined, onEstablished, onClosed, onFailed);
        } else {
            client = new WebsocketClient(domain, viewer, onJoined, onEstablished, onClosed, onFailed);
        }
        clients[domainIndex] = client;
        client.start(specificInstances);
    };

    const changeDomain = function (domainIndex) {
        let availableTabs = $(".domain.tabs .tabs-title.available").length;
        if (availableTabs <= 1) {
            return;
        }
        let activeTabs = $(".domain.tabs .tabs-title.available.is-active").length;
        let domain = domains[domainIndex];
        if (activeTabs === 0) {
            for (let key in domains) {
                if (!!domains[key].active) {
                    domains[key].active = false;
                    showDomain(domains[key]);
                }
            }
            domain.active = true;
            showDomain(domain);
        } else if (activeTabs === 1 && domain.active) {
            for (let key in domains) {
                if (domains[key].index !== domain.index) {
                    domains[key].active = true;
                    showDomain(domains[key]);
                }
            }
        } else if (activeTabs === 1 && !domain.active) {
            for (let key in domains) {
                if (domains[key].index !== domain.index) {
                    domains[key].active = false;
                    showDomain(domains[key]);
                }
            }
            domain.active = true;
            showDomain(domain);
        } else {
            domain.active = !!!domain.active;
            showDomain(domain);
        }
        let activeDomains = 0;
        for (let key in domains) {
            if (domains[key].active) {
                activeDomains++;
            }
        }
        $(".domain.tabs .tabs-title.available").removeClass("is-active");
        if (availableTabs > activeDomains) {
            for (let key in domains) {
                if (domains[key].active) {
                    $(".domain.tabs .tabs-title[data-domain-index=" + domains[key].index + "]").addClass("is-active");
                }
            }
        }
    };

    const showDomain = function (domain) {
        if (domain.active) {
            for (let key in instances) {
                let instance = instances[key];
                if (instance.active) {
                    $(".event-box[data-domain-index=" + domain.index + "][data-instance-name=" + instance.name + "]").show();
                    $(".visual-box[data-domain-index=" + domain.index + "][data-instance-name=" + instance.name + "]").show();
                    $(".console-box[data-domain-index=" + domain.index + "][data-instance-name=" + instance.name + "]").show();
                }
            }
            viewers[domain.index].setVisible(true);
            viewers[domain.index].refreshConsole();
        } else {
            viewers[domain.index].setVisible(false);
            for (let key in instances) {
                let instance = instances[key];
                if (instance.active) {
                    $(".event-box[data-domain-index=" + domain.index + "][data-instance-name=" + instance.name + "]").hide();
                    $(".visual-box[data-domain-index=" + domain.index + "][data-instance-name=" + instance.name + "]").hide();
                    $(".console-box[data-domain-index=" + domain.index + "][data-instance-name=" + instance.name + "]").hide();
                }
            }
        }
    }

    const changeDomainState = function (domain, errorOccurred) {
        let $titleTab = $(".domain.tabs .tabs-title[data-domain-index=" + domain.index + "]");
        let $indicator = $titleTab.find(".indicator");
        $indicator.removeClass($indicator.data("icon-connected") + " connected");
        $indicator.removeClass($indicator.data("icon-disconnected") + " disconnected");
        $indicator.removeClass($indicator.data("icon-error") + " error");
        if (errorOccurred) {
            $indicator.addClass($indicator.data("icon-error") + " error");
        } else if (domain.client.established) {
            $indicator.addClass($indicator.data("icon-connected") + " connected");
        } else {
            $indicator.addClass($indicator.data("icon-disconnected") + " disconnected");
        }
    }

    const changeInstance = function (instanceName) {
        let exists = false;
        for (let key in instances) {
            let instance = instances[key];
            if (!instanceName) {
                instanceName = instance.name;
            }
            let $tabTitle = $(".instance.tabs .tabs-title[data-instance-name=" + instance.name + "]");
            if (instance.name === instanceName) {
                instance.active = true;
                showDomainInstance(instanceName);
                if (!$tabTitle.hasClass("is-active")) {
                    $tabTitle.addClass("is-active");
                }
                exists = true;
            } else {
                instance.active = false;
                $tabTitle.removeClass("is-active");
            }
        }
        if (!exists && instanceName) {
            return changeInstance();
        } else {
            return instanceName;
        }
    }

    const showDomainInstance = function (instanceName) {
        for (let key in domains) {
            let domain = domains[key];
            if (domain.active) {
                $(".track-box[data-domain-index=" + domain.index + "] .bullet").remove();
                $(".event-box[data-domain-index=" + domain.index + "][data-instance-name!=" + instanceName + "]").hide();
                $(".event-box[data-domain-index=" + domain.index + "][data-instance-name=" + instanceName + "]").show();
                $(".visual-box[data-domain-index=" + domain.index + "][data-instance-name!=" + instanceName + "]").hide();
                $(".visual-box[data-domain-index=" + domain.index + "][data-instance-name=" + instanceName + "]").show();
                $(".console-box[data-domain-index=" + domain.index + "][data-instance-name!=" + instanceName + "]").hide();
                $(".console-box[data-domain-index=" + domain.index + "][data-instance-name=" + instanceName + "]").show().each(function () {
                    let $console = $(this).find(".console");
                    if (!$console.data("pause")) {
                        viewers[domain.index].refreshConsole($console);
                    }
                });
            }
        }
    };

    const initView = function () {
        $("ul.speed-options").hide();
        let pollingMode = false;
        for (let key in domains) {
            let domain = domains[key];
            if (domain.endpoint.mode === "polling") {
                pollingMode = true;
                break;
            }
        }
        if (pollingMode) {
            $("ul.speed-options").show();
        } else {
            $("ul.speed-options").hide();
        }
        for (let key in instances) {
            let instance = instances[key];
            let $eventBox = $(".event-box[data-instance-name=" + instance.name + "]");
            let $visualBox = $(".visual-box[data-instance-name=" + instance.name + "]");
            if ($eventBox.length && $visualBox.length) {
                if ($eventBox.find(".session-box.available").length === 0) {
                    $eventBox.removeClass("large-6").addClass("fixed-layout");
                    $visualBox.removeClass("large-6").addClass("fixed-layout");
                }
            } else {
                $eventBox.removeClass("large-6").addClass("fixed-layout");
                $visualBox.removeClass("large-6").addClass("fixed-layout");
            }
        }
    };

    const bindEvents = function () {
        $(".layout-options li a").off().on("click", function() {
            let $li = $(this).parent();
            if (!$li.hasClass("on")) {
                if ($li.hasClass("compact")) {
                    $li.addClass("on");
                    $(".event-box.available:not(.fixed-layout)").addClass("large-6");
                    $(".visual-box.available:not(.fixed-layout)").addClass("large-6");
                    $(".console-box.available").addClass("large-6");
                }
            } else {
                if ($li.hasClass("compact")) {
                    $li.removeClass("on");
                    $(".event-box.available:not(.fixed-layout)").removeClass("large-6");
                    $(".visual-box.available:not(.fixed-layout)").removeClass("large-6");
                    $(".console-box.available").removeClass("large-6");
                }
            }
            setTimeout(function () {
                for (let key in domains) {
                    let domain = domains[key];
                    clients[domain.index].refresh();
                }
            }, 50);
        });
        $(".speed-options li").off().on("click", function() {
            let $liFast = $(".speed-options li.fast");
            let faster = !$liFast.hasClass("on");
            if (!faster) {
                $liFast.removeClass("on");
            } else {
                $liFast.addClass("on");
            }
            for (let key in domains) {
                let domain = domains[key];
                if (domain.endpoint.mode === "polling") {
                    if (faster) {
                        clients[domain.index].speed(1);
                    } else {
                        clients[domain.index].speed(0);
                    }
                }
            }
        });
        $(".domain.tabs .tabs-title.available a").off("click").on("click", function() {
            let domainIndex = $(this).closest(".tabs-title").data("domain-index");
            changeDomain(domainIndex);
        });
        $(".instance.tabs .tabs-title.available a").off("click").on("click", function() {
            let instanceName = $(this).closest(".tabs-title").data("instance-name");
            changeInstance(instanceName);
        });
        $(document).off("click", ".event-box ul.sessions li")
            .on("click", ".event-box ul.sessions li", function() {
                $(this).toggleClass("designated");
        });
        $(".console-box .tailing-switch").off("click").on("click", function() {
            let $consoleBox = $(this).closest(".console-box");
            let $console = $consoleBox.find(".console");
            let domainIndex = $consoleBox.data("domain-index");
            if ($console.data("tailing")) {
                $console.data("tailing", false);
                $consoleBox.find(".tailing-status").removeClass("on");
            } else {
                $console.data("tailing", true);
                $(this).find(".tailing-status").addClass("on");
                viewers[domainIndex].refreshConsole($console);
            }
        });
        $(".console-box .pause-switch").off("click").on("click", function() {
            let $console = $(this).closest(".console-box").find(".console");
            if ($console.data("pause")) {
                $console.data("pause", false);
                $(this).removeClass("on");
            } else {
                $console.data("pause", true);
                $(this).addClass("on");
            }
        });
        $(".console-box .clear-screen").off("click").on("click", function() {
            let $consoleBox = $(this).closest(".console-box");
            let $console = $consoleBox.find(".console");
            let domainIndex = $consoleBox.data("domain-index");
            viewers[domainIndex].clearConsole($console);
        });
    };

    const clearView = function () {
        $(".domain.tabs .tabs-title.available").remove();
        $(".domain.tabs .tabs-title").show();
        $(".instance.tabs .tabs-title.available").remove();
        $(".instance.tabs .tabs-title").show();
        $(".event-box.available").remove();
        $(".console-box.available").remove();
        $(".console-box").show();
    };

    const clearConsole = function (domainIndex) {
        $(".console-box[data-domain-index=" + domainIndex + "] .console").empty();
    };

    const clearSessions = function (domainIndex) {
        $(".session-box[data-domain-index=" + domainIndex + "] .sessions").empty();
    };

    const buildView = function () {
        for (let key in domains) {
            let domain = domains[key];
            let $titleTab = addDomainTab(domain);
            let $domainIndicator = $titleTab.find(".indicator");
            viewers[domain.index].putIndicator("domain", "event", "", $domainIndicator);
        }
        for (let key in instances) {
            let instance = instances[key];
            let $titleTab = addInstanceTab(instance);
            let $instanceIndicator = $titleTab.find(".indicator");
            for (let key in domains) {
                let domain = domains[key];
                viewers[domain.index].putIndicator("instance", "event", instance.name, $instanceIndicator);
                if (instance.events && instance.events.length) {
                    let $eventBox = addEventBox(domain, instance);
                    for (let key in instance.events) {
                        let event = instance.events[key];
                        if (event.name === "activity") {
                            let $trackBox = addTrackBox($eventBox, domain, instance, event);
                            let $activities = $trackBox.find(".activities");
                            viewers[domain.index].putDisplay(instance.name, event.name, $trackBox);
                            viewers[domain.index].putIndicator(instance.name, "event", event.name, $activities);
                        } else if (event.name === "session") {
                            let $sessionBox = addSessionBox($eventBox, domain, instance, event);
                            viewers[domain.index].putDisplay(instance.name, event.name, $sessionBox);
                        }
                    }
                    let $visualBox = addVisualBox(domain, instance);
                    for (let key in instance.events) {
                        let event = instance.events[key];
                        let $chartBox = addChartBox($visualBox, domain, instance, event);
                        viewers[domain.index].putChart(instance.name, event.name, $chartBox.find(".chart"));
                    }
                }
                for (let key in instance.logs) {
                    let logInfo = instance.logs[key];
                    let $consoleBox = addConsoleBox(domain, instance, logInfo);
                    let $console = $consoleBox.find(".console").data("tailing", true);
                    $consoleBox.find(".tailing-status").addClass("on");
                    viewers[domain.index].putConsole(instance.name, logInfo.name, $console);
                    let $logIndicator = $consoleBox.find(".status-bar");
                    viewers[domain.index].putIndicator(instance.name, "log", logInfo.name, $logIndicator);
                }
            }
        }
        let instanceName = changeInstance();
        if (instanceName && location.hash) {
            let instanceName2 = location.hash.substring(1);
            if (instanceName !== instanceName2) {
                changeInstance(instanceName2);
            }
        }
    };

    const addDomainTab = function (domainInfo) {
        let $tabs = $(".domain.tabs");
        let $tab = $tabs.find(".tabs-title").first().hide().clone()
            .addClass("available")
            .attr("data-domain-index", domainInfo.index)
            .attr("data-domain-name", domainInfo.name)
            .attr("data-domain-title", domainInfo.title)
            .attr("data-domain-url", domainInfo.url);
        $tab.find("a .title").text(" " + domainInfo.title + " ");
        $tab.show().appendTo($tabs);
        return $tab;
    };

    const addInstanceTab = function (instanceInfo) {
        let $tabs = $(".instance.tabs");
        let $tab0 = $tabs.find(".tabs-title").first();
        let $tab = $tab0.hide().clone()
            .addClass("available")
            .attr("data-instance-name", instanceInfo.name)
            .attr("title", instanceInfo.title);
        $tab.find("a .title").text(" " + instanceInfo.title + " ");
        $tab.show().appendTo($tabs);
        return $tab;
    };

    const addEventBox = function (domainInfo, instanceInfo) {
        let $eventBox = $(".event-box");
        let $newBox = $eventBox.first().hide().clone()
            .addClass("available")
            .attr("data-domain-index", domainInfo.index)
            .attr("data-instance-name", instanceInfo.name);
        $newBox.find(".status-bar h4")
            .text(domainInfo.title);
        return $newBox.insertBefore($(".console-box").first());
    };

    const addTrackBox = function ($eventBox, domainInfo, instanceInfo, eventInfo) {
        let $trackBox = $eventBox.find(".track-box");
        let $newBox = $trackBox.first().hide().clone()
            .addClass("available")
            .attr("data-domain-index", domainInfo.index)
            .attr("data-instance-name", instanceInfo.name)
            .attr("data-event-name", eventInfo.name);
        return $newBox.insertAfter($trackBox.last()).show();
    };

    const addSessionBox = function ($eventBox, domainInfo, instanceInfo, eventInfo) {
        let $sessionBox = $eventBox.find(".session-box");
        let $newBox = $sessionBox.first().hide().clone()
            .addClass("available")
            .attr("data-domain-index", domainInfo.index)
            .attr("data-instance-name", instanceInfo.name)
            .attr("data-event-name", eventInfo.name);
        return $newBox.insertAfter($sessionBox.last()).show();
    };

    const addVisualBox = function (domainInfo, instanceInfo) {
        let $visualBox = $(".visual-box");
        let $newBox = $visualBox.first().hide().clone()
            .addClass("available")
            .attr("data-domain-index", domainInfo.index)
            .attr("data-instance-name", instanceInfo.name);
        return $newBox.insertBefore($(".console-box").first()).show();
    };

    const addChartBox = function ($visualBox, domainInfo, instanceInfo, eventInfo) {
        let $chartBox = $visualBox.find(".chart-box");
        let $newBox = $chartBox.first().hide().clone()
            .addClass("available large-6")
            .attr("data-domain-index", domainInfo.index)
            .attr("data-instance-name", instanceInfo.name)
            .attr("data-event-name", eventInfo.name);
        $newBox.find(".chart-title")
            .text(eventInfo.name);
        return $newBox.appendTo($visualBox).show();
    }

    const addConsoleBox = function (domainInfo, instanceInfo, logInfo) {
        let $consoleBox = $(".console-box");
        let $newBox = $consoleBox.first().hide().clone()
            .addClass("available large-6")
            .attr("data-domain-index", domainInfo.index)
            .attr("data-instance-name", instanceInfo.name)
            .attr("data-log-name", logInfo.name);
        $newBox.find(".status-bar h4")
            .text(domainInfo.title + " ›› " + logInfo.file);
        return $newBox.insertAfter($consoleBox.last());
    };
}
