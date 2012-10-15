/**
* Backbone localStorage Adapter
* https://github.com/jeromegn/Backbone.localStorage
*/ (function() {
    // A simple module to replace `Backbone.sync` with *localStorage*-based
    // persistence. Models are given GUIDS, and saved into a JSON object. Simple
    // as that.

    // Hold reference to Underscore.js and Backbone.js in the closure in order
    // to make things work even if they are removed from the global namespace
    var _ = this._;
    var Backbone = this.Backbone;

    // Generate four random hex digits.
    function S4() {
        return (((1 + Math.random()) * 0x10000) | 0)
            .toString(16)
            .substring(1);
    };

    // Generate a pseudo-GUID by concatenating random hexadecimal.
    function guid() {
        return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
    };

    // Our Store is represented by a single JS object in *localStorage*. Create it
    // with a meaningful name, like the name you'd give a table.
    // window.Store is deprectated, use Backbone.LocalStorage instead
    Backbone.LocalStorage = window.Store = function(name) {
        this.name = name;
        var store = this.localStorage()
            .getItem(this.name);
        this.records = (store && store.split(",")) || [];
    };

    _.extend(Backbone.LocalStorage.prototype, {

        // Save the current state of the **Store** to *localStorage*.
        save: function() {
            this.localStorage()
                .setItem(this.name, this.records.join(","));
        },

        // Add a model, giving it a (hopefully)-unique GUID, if it doesn't already
        // have an id of it's own.
        create: function(model) {
            if (!model.id) {
                model.id = guid();
                model.set(model.idAttribute, model.id);
            }
            this.localStorage()
                .setItem(this.name + "-" + model.id, JSON.stringify(model));
            this.records.push(model.id.toString());
            this.save();
            return model.toJSON();
        },

        // Update a model by replacing its copy in `this.data`.
        update: function(model) {
            this.localStorage()
                .setItem(this.name + "-" + model.id, JSON.stringify(model));
            if (!_.include(this.records, model.id.toString())) this.records.push(model.id.toString());
            this.save();
            return model.toJSON();
        },

        // Retrieve a model from `this.data` by id.
        find: function(model) {
            return JSON.parse(this.localStorage()
                .getItem(this.name + "-" + model.id));
        },

        // Return the array of all models currently in storage.
        findAll: function() {
            return _(this.records)
                .chain()
                .map(function(id) {
                return JSON.parse(this.localStorage()
                    .getItem(this.name + "-" + id));
            }, this)
                .compact()
                .value();
        },

        // Delete a model from `this.data`, returning it.
        destroy: function(model) {
            this.localStorage()
                .removeItem(this.name + "-" + model.id);
            this.records = _.reject(this.records, function(record_id) {
                return record_id == model.id.toString();
            });
            this.save();
            return model;
        },

        localStorage: function() {
            return localStorage;
        }

    });

    // localSync delegate to the model or collection's
    // *localStorage* property, which should be an instance of `Store`.
    // window.Store.sync and Backbone.localSync is deprectated, use Backbone.LocalStorage.sync instead
    Backbone.LocalStorage.sync = window.Store.sync = Backbone.localSync = function(method, model, options, error) {
        var store = model.localStorage || model.collection.localStorage;

        // Backwards compatibility with Backbone <= 0.3.3
        if (typeof options == 'function') {
            options = {
                success: options,
                error: error
            };
        }

        var resp;

        switch (method) {
        case "read":
            resp = model.id != undefined ? store.find(model) : store.findAll();
            break;
        case "create":
            resp = store.create(model);
            break;
        case "update":
            resp = store.update(model);
            break;
        case "delete":
            resp = store.destroy(model);
            break;
        }

        if (resp) {
            options.success(resp);
        } else {
            options.error("Record not found");
        }
    };

    Backbone.ajaxSync = Backbone.sync;

    Backbone.getSyncMethod = function(model) {
        if (model.localStorage || (model.collection && model.collection.localStorage)) {
            return Backbone.localSync;
        }

        return Backbone.ajaxSync;
    };

    // Override 'Backbone.sync' to default to localSync,
    // the original 'Backbone.sync' is still available in 'Backbone.ajaxSync'
    Backbone.sync = function(method, model, options, error) {
        return Backbone.getSyncMethod(model)
            .apply(this, [method, model, options, error]);
    };

})();

jQuery.getFeed = function(options) {

    options = jQuery.extend({

        url: null,
        data: null,
        cache: true,
        success: null,
        failure: null,
        error: null,
        global: true

    }, options);

    if (options.url) {

        if (jQuery.isFunction(options.failure) && jQuery.type(options.error) === 'null') {
            // Handle legacy failure option
            options.error = function(xhr, msg, e) {
                options.failure(msg, e);
            }
        } else if (jQuery.type(options.failure) === jQuery.type(options.error) === 'null') {
            // Default error behavior if failure & error both unspecified
            options.error = function(xhr, msg, e) {
                window.console && console.log('getFeed failed to load feed', xhr, msg, e);
            }
        }

        return $.ajax({
            type: 'GET',
            url: options.url,
            data: options.data,
            cache: options.cache,
            dataType: (jQuery.browser.msie) ? "text" : "xml",
            success: function(xml) {
                var feed = new JFeed(xml);
                if (jQuery.isFunction(options.success)) options.success(feed);
            },
            error: options.error,
            global: options.global
        });
    }
};

function JFeed(xml) {
    if (xml) this.parse(xml);
};

JFeed.prototype = {

    type: '',
    version: '',
    title: '',
    link: '',
    description: '',
    parse: function(xml) {

        if (jQuery.browser.msie) {
            var xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
            xmlDoc.loadXML(xml);
            xml = xmlDoc;
        }

        if (jQuery('channel', xml)
            .length == 1) {

            this.type = 'rss';
            var feedClass = new JRss(xml);

        } else if (jQuery('feed', xml)
            .length == 1) {

            this.type = 'atom';
            var feedClass = new JAtom(xml);
        }

        if (feedClass) jQuery.extend(this, feedClass);
    }
};

function JFeedItem() {};

JFeedItem.prototype = {

    title: '',
    link: '',
    description: '',
    updated: '',
    id: ''
};

function JAtom(xml) {
    this._parse(xml);
};

JAtom.prototype = {

    _parse: function(xml) {

        var channel = jQuery('feed', xml)
            .eq(0);

        this.version = '1.0';
        this.title = jQuery(channel)
            .find('title:first')
            .text();
        this.link = jQuery(channel)
            .find('link:first')
            .attr('href');
        this.description = jQuery(channel)
            .find('subtitle:first')
            .text();
        this.language = jQuery(channel)
            .attr('xml:lang');
        this.updated = jQuery(channel)
            .find('updated:first')
            .text();

        this.items = new Array();

        var feed = this;

        jQuery('entry', xml)
            .each(function() {

            var item = new JFeedItem();

            item.title = jQuery(this)
                .find('title')
                .eq(0)
                .text();
            item.link = jQuery(this)
                .find('link')
                .eq(0)
                .attr('href');
            item.description = jQuery(this)
                .find('content')
                .eq(0)
                .text();
            item.updated = jQuery(this)
                .find('updated')
                .eq(0)
                .text();
            item.id = jQuery(this)
                .find('id')
                .eq(0)
                .text();

            feed.items.push(item);
        });
    }
};

function JRss(xml) {
    this._parse(xml);
};

JRss.prototype = {

    _parse: function(xml) {

        if (jQuery('rss', xml)
            .length == 0) this.version = '1.0';
        else this.version = jQuery('rss', xml)
            .eq(0)
            .attr('version');

        var channel = jQuery('channel', xml)
            .eq(0);

        this.title = jQuery(channel)
            .find('title:first')
            .text();
        this.link = jQuery(channel)
            .find('link:first')
            .text();
        this.description = jQuery(channel)
            .find('description:first')
            .text();
        this.language = jQuery(channel)
            .find('language:first')
            .text();
        this.updated = jQuery(channel)
            .find('lastBuildDate:first')
            .text();

        this.items = new Array();

        var feed = this;

        jQuery('item', xml)
            .each(function() {

            var item = new JFeedItem();

            item.title = jQuery(this)
                .find('title')
                .eq(0)
                .text();
            item.link = jQuery(this)
                .find('link')
                .eq(0)
                .text();
            item.description = jQuery(this)
                .find('description')
                .eq(0)
                .text();
            item.updated = jQuery(this)
                .find('pubDate')
                .eq(0)
                .text();
            item.id = jQuery(this)
                .find('guid')
                .eq(0)
                .text();

            feed.items.push(item);
        });
    }
};