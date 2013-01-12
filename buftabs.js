'use strict';
let buftabs = {
    id: 'dactyl-statusline-field-buftabs',
    fullLoad: false,
    init: function() {
        if (buftabs.options['buftabs']) {
            if (document.getElementById(buftabs.id))
                commandline.widgets.updateVisibility();
            else {
                let widget = DOM.fromJSON(['hbox',
                        {'xmlns': XUL,
                            'id': buftabs.id,
                            'dactyl:highlight': 'BufTabs',
                            'flex': 1}],
                    document);
                statusline.widgets.url.parentNode.insertBefore(widget,
                    statusline.widgets.url.nextSibling);
                commandline.widgets.addElement({
                    name: 'buftabs',
                    getGroup: function() this.statusbar,
                    getValue: function() statusline.visible &&
                        buftabs.options['buftabs'],
                    noValue: true
                });
                commandline.widgets.statusbar.buftabs.addEventListener(
                    'DOMMouseScroll',
                    function(event) {
                        window.gBrowser.tabContainer.advanceSelectedTab(
                            event.detail < 0 ? -1 : 1, true);
                        event.stopPropagation();
                    }, true);

                buftabs.toggleProgressBar();
            }
            registerMyListener();
            buftabs.update();
        } else
            buftabs.destory();
        buftabs.fullLoad = true;
    },

    setup: function() {
        buftabs.fullLoad = true;
        ex.set('buftabs!');
    },

    destory: function() {
        unregisterMyListener();
    },

    get options() buftabs._options ||
        {'elem': 'nthbi', 'buftabs': true, 'rnu': true, 'progress': true},
    set options(options) {
        buftabs._options = {
            'elem' : 'elem' in options ? options['elem'] :
                buftabs.options['elem'],
            'buftabs': 'buftabs' in options ? options['buftabs'] :
                buftabs.options['buftabs'],
            'rnu': 'rnu' in options ? options['rnu'] : buftabs.options['rnu'],
            'progress': 'progress' in options ? options['progress'] :
                buftabs.options['progress']
        };
        if (buftabs.fullLoad) // window has fully loaded
            buftabs.init();
    },

    get btabs() commandline.widgets.statusbar.buftabs,

    get blabels() buftabs.btabs.childNodes,

    get curLabelIndex() buftabs._curLabelIndex,

    set curLabelIndex(value) {
        buftabs._curLabelIndex = value;
    },

    Otab: function(arg) {
        if (typeof arg == 'object')
            return arg;
        return window.gBrowser.tabs[arg];
    },

    mb_strlen: function(str) {
        let m = encodeURIComponent(str).match(/%[89ABab]/g);
        let extra_length = m ? m.length / 3 : 0;
        return str.length + extra_length;
    },

    mb_substr: function(str, length) {
        let i = 0;
        let overflow = false;
        let plength = 0;
        while (!overflow) {
            plength = buftabs.mb_strlen(str.substr(0, i));
            if (plength >= length)
                overflow = true;
            i = i + 1;
        }
        return str.substr(0, i).replace(/^\s+|\s+$/g, '');
    },

    Obrowser: function(arg) {
        if (typeof arg == 'object') // a label obj
            return arg;
        return window.gBrowser.getBrowserAtIndex(arg);
    },
    Olabel: function(arg) {
        if (typeof arg == 'object')
            return arg;
        return buftabs.blabels[arg];
    },

    Oposition: function(arg) {
        let label = arg;
        if (typeof arg != 'object')
            label = buftabs.Olabel(arg);
        return label.getBoundingClientRect();
    },

    Onavigation: function(arg) {
        let tab = arg;
        if (typeof arg != 'object')
            tab = buftabs.Otab(arg);
        let browser = tab.linkedBrowser;
        // history
        if (browser.webNavigation) {
            let sh = browser.webNavigation.sessionHistory;
            if (sh && (sh.index > 0) && (sh.index < sh.count - 1))
                return UTF8('↔');
            if (sh && (sh.index < sh.count - 1) && (sh.index == 0))
                return UTF8('→');
            if (sh && (sh.index >= sh.count - 1) && (sh.index > 0))
                return UTF8('←');
        }
        return '';
    },

    setFavicon: function(aLabel, aTab) {
        let label = buftabs.Olabel(aLabel);
        let tab = buftabs.Otab(aTab);
        let image = tab.image;
        if (tab.linkedBrowser.webProgress.isLoadingDocument)
            image = 'chrome://browser/skin/tabbrowser/connecting.png';
        else if (image == '')
            image = BookmarkCache.DEFAULT_FAVICON;

        label.style.paddingLeft = '20px';
        label.style.backgroundImage = 'url("' + image + '")';
    },

    removeFavicon: function(arg) {
        let label = buftabs.Olabel(arg);
        label.style.paddingLeft = '2px';
        label.style.backgroundImage = 'none';
    },

    showFavicons: function() {
        buftabs.blabels.foreach(function(label) buftabs.setFavicon(label));
        buftabs.layout();
    },

    // layout
    layout: function() {
        // Scroll
        let position = buftabs.Oposition(buftabs.curLabelIndex);
        let first_position = buftabs.Oposition(0);
        let last_position = buftabs.Oposition(buftabs.blabels.length - 1);
        let btabs_position = buftabs.btabs.getBoundingClientRect();

        let next_position = false;
        if (buftabs.curLabelIndex + 1 < buftabs.blabels.length)
            next_position = buftabs.Oposition(buftabs.curLabelIndex + 1);

        let prev_position = false;
        if (buftabs.curLabelIndex > 0)
            prev_position = buftabs.Oposition(buftabs.curLabelIndex - 1);

        if (next_position) {
            if (next_position['right'] >= btabs_position['right'])
                buftabs.btabs.scrollLeft = next_position['right'] +
                   btabs_position['left'] - first_position['left'] -
                   btabs_position['right'];
        } else {
            if (position['right'] >= btabs_position['right'])
                buftabs.btabs.scrollLeft = position['right'] +
                   btabs_position['left'] - first_position['left'] -
                   btabs_position['right'];
        }

        if (prev_position) {
            if (prev_position['left'] <= btabs_position['left'])
                buftabs.btabs.scrollLeft = prev_position['left'] -
                   first_position['left'];

        } else {
            if (position['left'] <= btabs_position['left'])
                buftabs.btabs.scrollLeft = 0;
        }

        // Show the entire line if possible
        if (buftabs.btabs.scrollWidth <= buftabs.btabs.clientWidth)
            buftabs.btabs.scrollLeft = 0;
        else {
            // check last label position
            let sum = 0;
            let labels = Array.slice(buftabs.blabels);
            labels.forEach(function(label) {
                sum += label.scrollWidth;
            });
            if (last_position['right'] < buftabs.btabs.clientWidth)
                // This doesn't work, why?
                // buftabs.btabs.scrollLeft = buftabs.btabs.scrollWidth -
                    // buftabs.btabs.clientWidth;
                buftabs.btabs.scrollLeft = sum - buftabs.btabs.clientWidth;
        }

    },

    obtainElements: function(container) {
        let nodes = container.childNodes;
        for each(let node in nodes) {
            object[node.key] = node;
        }
    },

    toggleProgressBar: function() {
        commandline.widgets.addElement({
                name: 'progress',
                getGroup: function() this.statusbar,
                getValue: function() buftabs.options['progress'] ||
                    !buftabs.options['buftabs'],
                noValue: true
        });
    },

    buildLabels: function() {
        // Get buftabbar
        let btabs = buftabs.btabs;
        let visibleTabs_length = window.gBrowser.visibleTabs.length;

        // Make sure we have an appropriate amount of labels
        while (btabs.childNodes.length > visibleTabs_length)
            btabs.removeChild(btabs.lastChild);

        while (btabs.childNodes.length < visibleTabs_length) {
            let label = document.createElement('label');
            label.setAttribute('crop', 'end');
            btabs.appendChild(label);
            label.addEventListener('mouseover', function(ev) {
                buftabs.updateLabelTooltip(this, this.tabindex);
            }, false);
            label.addEventListener('click', function(ev) {
                let gBrowser = window.gBrowser;
                if (ev.button == 0)
                    gBrowser.selectTabAtIndex(this.tabpos);
                else if (ev.button == 1) {
                    gBrowser.removeTab(
                        gBrowser.tabContainer.getItemAtIndex(this.tabindex));
                }
            }, false);
        }
    },
    // Update the tabs
    update: function() {
        if (!buftabs.options['buftabs'])
            return;

        buftabs.buildLabels();

        let visibleTabs = window.gBrowser.visibleTabs;
        // Create the new tabs
        Array.forEach(visibleTabs, function(tab, idx) {
            // Create label
            let label = buftabs.Olabel(idx);

            // Fill label
            label.tabpos = idx;
            label.tabindex = window.gBrowser.tabContainer.getIndexOfItem(tab);

            buftabs.fillLabel(label, tab);
        });
        buftabs.curLabelIndex = tabs.index(null, true);
        buftabs.layout();

    },

    updateTabOpen: function(aEvent) {
        buftabs.update();
    },

    updateTabHide: function(aEvent) {
        buftabs.update();
    },

    updateTabMove: function(aEvent) {
        buftabs.update();
    },

    updateTabSelect: function(aEvent) {
        buftabs.update();
    },

    updateTabClose: function(aEvent) {
        if (!buftabs.options['buftabs'])
            return;

        buftabs.buildLabels();

        let visibleTabs = window.gBrowser.visibleTabs;
        var closed_labelIndex =
            window.gBrowser.tabContainer.getIndexOfItem(aEvent.target);
        // Create the new tabs
        Array.forEach(visibleTabs, function(tab, idx) {
            // Create label
            let label = buftabs.Olabel(idx);

            // Fill label
            label.tabpos = idx;
            label.tabindex = window.gBrowser.tabContainer.getIndexOfItem(tab);
            // dirty hack, I don't know why
            // maybe visibleTabs are been cached?
            if (label.tabindex > closed_labelIndex)
                label.tabindex = label.tabindex - 1;

            buftabs.fillLabel(label, tab);
        });
        buftabs.curLabelIndex = tabs.index(null, true);
        buftabs.layout();

    },

    updateTabAttrModified: function(aEvent) {
        if (!aEvent.target.hidden) {
            let tab = aEvent.target;
            let labelindex = tabs.index(tab, true);
            buftabs.fillLabel(labelindex, tab);
            dactyl.timeout(buftabs.layout, 400);
        }
    },

    updateTabPinned: function(aEvent) {
        if (!aEvent.target.hidden) {
            let tab = aEvent.target;
            let labelindex = tabs.index(tab, true);
            buftabs.fillLabel(labelindex, tab);
            dactyl.timeout(buftabs.layout, 400);
        }
    },

    updateTabUnpinned: function(aEvent) {
        if (!aEvent.target.hidden) {
            let tab = aEvent.target;
            let labelindex = tabs.index(tab, true);
            buftabs.fillLabel(labelindex, tab);
            dactyl.timeout(buftabs.layout, 400);
        }
    },

    // fill a label
    fillLabel: function(arglabel, argtab) {
        let label = buftabs.Olabel(arglabel);
        let tab = buftabs.Otab(argtab);
        let browser = tab.linkedBrowser;
        let tabvalue = '';

        if (tab.pinned) {
            label.setAttribute('pinned', 'true');
            buftabs.setFavicon(label, tab);
            // tab index
            if (buftabs.options['elem'].indexOf('n') >= 0 &&
                !buftabs.options['rnu']) {
                let index = label.tabindex + 1;
                label.setAttribute('value', index + ' ');
            } else {
                label.setAttribute('value', '');
            }
        } else {
            label.setAttribute('pinned', 'false');
            // Get title
            if (buftabs.options['elem'].indexOf('t') >= 0)
                tabvalue += tab.label;

            let indicate = '';
            // Get history
            if (buftabs.options['elem'].indexOf('h') >= 0)
                indicate = buftabs.Onavigation(tab);
            // tabvalue += buftabs.Onavigation(tab); // todo, use tab directly

            // Bookmark icon
            if (buftabs.options['elem'].indexOf('b') >= 0) {
                let href = browser.contentDocument.location.href;
                if (bookmarkcache.isBookmarked(href))
                    indicate += UTF8('❤');
            }

            // Brackets and index
            if (buftabs.options['elem'].indexOf('n') >= 0) {
                if (buftabs.options['rnu']) {
                    if (indicate.length > 0)
                        indicate = (label.tabpos + 1) + ' ' + indicate + ' ';
                    else
                        indicate = (label.tabpos + 1) + ' ';
                } else {
                    if (indicate.length > 0)
                        indicate = (label.tabindex + 1) + ' ' + indicate + ' ';
                    else
                        indicate = (label.tabindex + 1) + ' ';
                }
            }

            tabvalue = indicate + tabvalue;

            label.setAttribute('value', tabvalue);
            // tabbrowser getIcon
            if (buftabs.options['elem'].indexOf('i') >= 0)
                buftabs.setFavicon(label, tab);
            else
                buftabs.removeFavicon(label);
        }

        // Set the correct highlight group
        if (tabs.index(null, true) == label.tabpos)
            label.setAttributeNS(NS, 'highlight', 'BufTabSelected');
        else {
            if (tabs.index(tabs.alternate, true) == label.tabpos)
                label.setAttributeNS(NS, 'highlight', 'BufTabAlternate');
            else
                label.setAttributeNS(NS, 'highlight', 'BufTab');
        }

    },

    updateLabelTooltip: function(aLabel, aTab) {
        let label = buftabs.Olabel(aLabel);
        let tab = buftabs.Otab(aTab);
        let browser = tab.linkedBrowser;
        label.setAttribute('tooltiptext', tab.label + '\n' +
            browser.currentURI.spec);
    }
};

function registerMyListener() {
    let add = window.gBrowser.tabContainer.addEventListener;
    add('TabOpen', buftabs.updateTabOpen, false);
    add('TabHide', buftabs.updateTabHide, false);
    add('TabMove', buftabs.updateTabMove, false);
    add('TabClose', buftabs.updateTabClose, false);
    add('TabSelect', buftabs.updateTabSelect, false);
    add('TabAttrModified', buftabs.updateTabAttrModified, false);
    add('TabPinned', buftabs.updateTabPinned, false);
    add('TabUnpinned', buftabs.updateTabUnpinned, false);
    window.addEventListener('fullscreen', buftabs.layout, false);
}

function unregisterMyListener() {
    let remove = window.gBrowser.tabContainer.removeEventListener;
    remove('TabOpen', buftabs.updateTabOpen, false);
    remove('TabHide', buftabs.updateTabHide, false);
    remove('TabMove', buftabs.updateTabMove, false);
    remove('TabClose', buftabs.updateTabClose, false);
    remove('TabSelect', buftabs.updateTabSelect, false);
    remove('TabAttrModified', buftabs.updateTabAttrModified, false);
    remove('TabPinned', buftabs.updateTabPinned, false);
    remove('TabUnpinned', buftabs.updateTabUnpinned, false);
    window.removeEventListener('fullscreen', buftabs.layout, false);
}
buftabs.init();
window.addEventListener('unload', buftabs.destory, false);

// Options
group.options.add(['buftabs-progress', 'btp'],
    'Show progress',
    'boolean',
    true,
    {
        setter: function(value) {
            buftabs.options = {'progress': value};
            return value;
        }
    }
);

group.options.add(['buftabs-rnu', 'btr'],
    'Show Relative tabnumber',
    'boolean',
    true,
    {
        setter: function(value) {
            buftabs.options = {'rnu': value};
            return value;
        }
    }
);

group.options.add(['buftabs-elem', 'bte'],
        'Show or hide certain elemments',
        'charlist',
        'nthbi',
        {
            values: {
                'i': 'Favicon',
                'n': 'Tabnumber',
                't': 'Tab title',
                'h': 'History forward/backward indicate',
                'b': 'Bookmark state'
            },
            setter: function(value) {
                buftabs.options = {'elem': value};
                return value;
            }
        });

group.options.add(['buftabs', 'bt'],
        'Control whether to use buftabs in the statusline',
        'boolean',
        true,
        {
            setter: function(value) {
                buftabs.options = {'buftabs' : value};
                return value;
            }
        }
);

// Add custom commands
group.commands.add(['buf[tabs]', 'bt'],
    'Activate buftabs manually',
    buftabs.setup,
    {
        argCount: 0
    },
    true
);

// Initialise highlight groups
highlight.loadCSS(literal(/*
     BufTabs {
         color: inherit;
         margin:0 !important;
         padding:0 !important;
         overflow:hidden;
     }
     BufTabSelected {
         background-repeat:no-repeat;
         background-size:contain, contain;
         background-position: 2px top;
         background-color:#fff;
         color:#000;
         margin:0 !important;
         font-weight:normal;
         border-bottom-left-radius:2px;
         border-bottom-right-radius:2px;
         max-width:130px;
     }
     BufTabAlternate {
         background-repeat:no-repeat;
         background-size:contain, contain;
         background-position: 2px top;
         margin:0 !important;
         cursor:pointer !important;
         max-width:130px;
    }
    BufTab {
        background-repeat:no-repeat;
        background-size:contain, contain;
        background-position: 2px top;
        margin:0 !important;
        cursor:pointer !important;
        max-width:130px;
    }
    BufTab:hover {
        color:#2e3330;
        background-color: #88b090;
        border-bottom-left-radius:2px;
        border-bottom-right-radius:2px;
    }
    BufTabAlternate:hover {
        color:#2e3330;
        background-color: #88b090;
        border-bottom-left-radius:2px;
        border-bottom-right-radius:2px;
    }
*/), true);
