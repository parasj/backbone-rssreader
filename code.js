$(function() {
    var Blog = Backbone.Model.extend({
        defaults: function() {
            return {
                title: "Paras Jain's Blog",
                desc: "Paras Jain's Blog",
                url: "http://blog.parasjain.com/"
            };
        },

        initialize: function() {
            if(!this.get("title")) {
                this.set({
                    "title": this.defaults.title
                });
            }
            if(!this.get("desc")) {
                this.set({
                    "desc": this.defaults.desc
                });
            }
        }
    });

    var Article = Backbone.Model.extend({
        defaults: function() {
            return {
                title: "Empty Title",
                desc: "Empty Description",
                url: "http://blog.parasjain.com/"
            };
        },

        initialize: function() {
            if(!this.get("title")) {
                this.set({
                    "title": this.defaults.title
                });
            }
            if(!this.get("desc")) {
                this.set({
                    "desc": this.defaults.desc
                });
            }
        },

        read: function() {
            this.save({
                read: true
            });
        },

        remove: function() {
            this.destroy();
        }
    });

    // Collection: ArticleList
    var ArticleList = Backbone.Collection.extend({
        model: Article,
        localStorage: new Store("reader"),

        read: function() {
            return this.filter(function(article) {
                return article.get('read');
            });
        },
        unread: function() {
            return this.without.apply(this, this.read());
        },

        clear: function() {
            return this.each(function(article) {
                article.remove();
            });
        }
    });

    var Articles = new ArticleList;

    // View: ArticleView
    var ArticleView = Backbone.View.extend({
        tagName: "tr",
        template: _.template($('#item-template').html()),

        events: {
            "click .article-item": "triggerNav"
        },

        initialize: function() {
            this.model.bind('change', this.render, this);
            this.model.bind('destroy', this.remove, this);
        },

        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },

        triggerNav: function() {
            var url = this.model.toJSON().url;
            console.log("Nav change requested:", url);
            window.location = url;
        }
    });

    // View: AppView
    var AppView = Backbone.View.extend({
        el: $("#readerapp"),
        events: {
            "click button#newArticle": "createNewArticle",
            "click button#clearArticles": "clearArticles",
        },

        initialize: function() {
            jQuery.getFeed({
                url: 'rss.xml',
                success: function(feed) {
                    $("#blogtitle").html(feed.title);
                    _.each(feed.items, function(blogItem) {
                        console.log(blogItem);
                        var description = $(blogItem.description).text();
                        Articles.create({
                            title: blogItem.title,
                            desc: description,
                            url: blogItem.link,
                            date: blogItem.updated
                        });
                    });
                }
            });

            Articles.bind('add', this.addOne, this);
            Articles.bind('reset', this.addAll, this);

            // Articles.fetch();
        },

        addOne: function(article) {
            var view = new ArticleView({
                model: article
            });
            this.$("#article-list").append(view.render().el);
        },

        addAll: function() {
            Articles.each(this.addOne);
        },

        createNewArticle: function() {
            console.log(0)
            var article = Articles.create({
                title: "New Article",
                desc: "This must really be an interesting article..."
            });
        },

        clearArticles: function() {
            Articles.clear();
            this.addAll();
        }
    });

    var App = new AppView;
});