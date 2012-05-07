/**
 * @include GeoExt/widgets/MapPanel.js
 */


/** 
 *  @example
 *     
 *      var popup = new GeoExt.Popup({
 *          title: "My Popup",
 *          location: feature,
 *          width: 200,
 *          html: "<div>Popup content</div>",
 *          collapsible: true
 *      });
 */

/**
 * @class GeoExt.window.Popup
 */
Ext.define('GeoExt.window.Popup', {
    extend: 'Ext.window.Window',
    alias: 'widget.gx_popup',
    alternateClassName : 'GeoExt.Popup',
    
    /**
     * @property {Boolean} insideViewport
     * @private
     * Whether the popup is currently inside the map viewport.
     */
    insideViewport: null,
    
    /**
     * @property {Boolean} animCollapse
     * @private
     * Animate the transition when the panel is collapsed.
     * Default is ``false``.  Collapsing animation is not supported yet for 
     * popups.
     */
    animCollapse: false,
    
    /**
     * @property {Boolean} draggable
     * @private
     * Enable dragging of this Panel.  Defaults to ``false`` 
     * because the popup defaults to being anchored, and anchored popups 
     * should not be draggable.
     */
    draggable: false,

    /**
     * @property {Boolean} shadow
     * @private
     * Give the popup window a shadow.  Defaults to ``false`` 
     * because shadows are not supported yet for popups (the shadow does 
     * not look good with the anchor).
     */
    shadow: false,
    
    /** api: config[unpinnable]
     *  ``Boolean`` The popup should have a "unpin" tool that unanchors it from
     *  its location.  Default is ``true``.
     */

    /** 
     * @cfg {Boolean} unpinnable
     * The popup should have a "unpin" tool that unanchors it from 
     * its location.  Default is ``true``.
     */
    unpinnable: true,
    
    /** 
     * @cfg {OpenLayers.Map / GeoExt.MapPanel} map
     * The map this popup will be anchored to (only required if ``anchored``
     * is set to true and the map cannot be derived from the ``location``'s
     * layer.
     */
    map: null,
    
    config: {
    
        /** 
         * @cfg {Boolean} anchored
         * The popup begins anchored to its location. Default is
         *  ``true``.
         */
        anchored: true,
    
        /** 
         * @cfg {Boolean} panIn
         * The popup should pan the map so that the popup is 
         * fully in view when it is rendered.  Default is ``true``.
         */
        panIn: true,
        
        /** 
         * @cfg {OpenLayers.Feature.Vector / OpenLayers.LonLat / OpenLayers.Pixel} location
         * A location for this popup's anchor.
         */
        location: null,
    
        /**
         * Some Ext.Window defaults need to be overriden here
         * because some Ext.Window behavior is not currently supported.
         */    
    
        /** 
         * @cfg {String} popupCls
         * CSS class name for the popup DOM elements. Default is
         *  "gx-popup".
         */
        popupCls: "gx-popup",
    
        /** 
         * @cfg {String} ancCls
         * CSS class name for the popup's anchor.
         */
        ancCls: null,
        
        /** 
         * @cfg {String} anchorPosition
         * Controls the anchor position for the popup. If set to
         *  ``auto``, the anchor will be positioned on the top or the bottom of
         *  the window, minimizing map movement. Supported values are ``bottom-left``,
         *  ``bottom-right``, ``top-left``, ``top-right`` or ``auto``.
         *  Defaults to ``auto``.
         */
        anchorPosition: "auto",
    },
    
    /**
     * 
     */
    initComponent: function() {
        if(this.map instanceof GeoExt.MapPanel) {
            this.map = this.map.map;
        }
        if(!this.map && this.getLocation() instanceof OpenLayers.Feature.Vector &&
                                                        this.getLocation().layer) {
            this.map = this.getLocation().layer.map;
        }
        if (this.getLocation() instanceof OpenLayers.Feature.Vector) {
            this.setLocation(this.getLocation().geometry);
        }
        if (this.getLocation() instanceof OpenLayers.Geometry) {
            if (typeof this.getLocation().getCentroid == "function") {
                this.setLocation(this.getLocation().getCentroid());
            }
            this.setLocation(this.getLocation().getBounds().getCenterLonLat());
        } else if (this.getLocation() instanceof OpenLayers.Pixel) {
            this.setLocation(this.map.getLonLatFromViewPortPx(this.getLocation()));
        } else {
            this.setAnchored(false);
        }

        var mapExtent =  this.map.getExtent();
        if (mapExtent && this.getLocation()) {
            this.insideViewport = mapExtent.containsLonLat(this.getLocation());
        }

        if(this.getAnchored()) {
            this.addAnchorEvents();
        }

        this.baseCls = this.getPopupCls() + " " + this.baseCls;
        this.elements += ',anc';
        
        this.callParent(arguments);
    },

    /**
     * @private
     * @param {Object} ct
     * @param {Object} position
     * The "onRender" listener of this component.
     * Executes when the popup is rendered and creates the anchor div
     */
    onRender: function(ct, position) {
        this.callParent(arguments);
        this.setAncCls(this.getPopupCls() + "-anc");
        
        //create anchor dom element.
        //this.createElement("anc", this.el.dom);
        var dh = Ext.core.DomHelper; // create shorthand alias
        // specification the anchor div
        var spec = {
            tag: 'div',
            cls: this.getAncCls()
        };
        
        var ancDiv = dh.append(
            this.el.dom, // the context element 'my-div' can either be the id or the actual node
            spec      // the specification object
        );
        this.anc = Ext.get(ancDiv);
    },

    /**
     * @private
     * Initializes the tools on the popup.  In particular
     * it adds the 'unpin' tool if the popup is unpinnable.
     */
    initTools : function() {
        if(this.unpinnable) {
            if (!this.tools) {
                this.tools = [];
            }
            this.tools.push({
                type:'unpin',
                handler: Ext.bind(this.unanchorPopup, this, [])
            });
        }
        this.callParent(arguments);
    },

    /**
     * @private
     * Override.
     */
    show: function() {
        this.callParent(arguments);
        if(this.getAnchored()) {
            this.position();
            if(this.getPanIn() && !this._mapMove) {
                this.panIntoView();
            }
        }
    },
    
    /**
     * @private
     * Override.
     */
    Override.
    maximize: function() {
        if(!this.maximized && this.anc) {
            this.unanchorPopup();
        }
        this.callParent(arguments);
    },
    
    /**
     * @param {Integer} w the width to apply.
     * @param {Integer} h the height to apply.
     * Sets the size of the popup, taking into account the size of the anchor.
     */
    setSize: function(w, h) {
        if(this.anc) {
            var ancSize = this.anc.getSize();
            
            if(typeof w == 'object') {
                h = w.height - ancSize.height;
                w = w.width;
            } else if(!isNaN(h)){
                h = h - ancSize.height;
            }
        }
        this.callParent([w,h]);
    },

    /**
     * @private
     * Positions the popup relative to its location
     */
    position: function() {
        if(this._mapMove === true) {
            this.insideViewport = this.map.getExtent().containsLonLat(this.getLocation());
            if(this.insideViewport !== this.isVisible()) {
                this.setVisible(this.insideViewport);
            }
        }

        if(this.isVisible()) {
            var locationPx = this.map.getPixelFromLonLat(this.getLocation()),
                mapBox = Ext.fly(this.map.div).getBox(true),
                top = locationPx.y + mapBox.y,
                left = locationPx.x + mapBox.x,
                elSize = this.el.getSize(),
                ancSize = this.anc.getSize(),
                ancPos = this.getAnchorPosition();
            
            if (ancPos.indexOf("right") > -1 || locationPx.x > mapBox.width / 2) {
                // right
                this.anc.addCls("right");
                var ancRight = this.el.getX(true) + elSize.width -
                               this.anc.getX(true) - ancSize.width;
                left -= elSize.width - ancRight - ancSize.width / 2;
            } else {
                // left
                this.anc.removeCls("right");
                var ancLeft = this.anc.getLeft(true);
                left -= ancLeft + ancSize.width / 2;
            }

            if (ancPos.indexOf("bottom") > -1 || locationPx.y > mapBox.height / 2) {
                // bottom
                this.anc.removeCls("top");
                // position the anchor
                var popupHeight = this.getHeight();
                if (isNaN(popupHeight) === false) {
                    this.anc.setTop((popupHeight-1) + "px");
                }
                
                top -= elSize.height + ancSize.height;
                
            } else {
                // top
                this.anc.addCls("top");
                // remove eventually set top property (bottom-case) 
                this.anc.setTop("");
                top += ancSize.height; // ok
            }

            this.setPosition(left, top);
        }
    },
    
    /**
     * @private
     * Unanchors a popup from its location. This removes the popup from its 
     * MapPanel and adds it to the page body.
     */
    unanchorPopup: function() {
        this.removeAnchorEvents();
        
        //make the window draggable
        this.draggable = true;
        this.header.addCls("x-window-header-draggable");
        var ddConfig = Ext.applyIf({
            el: this.el,
            delegate: '#' + Ext.escapeId(this.header.id)
        }, this.draggable);
        this.dd = new Ext.util.ComponentDragger(this, ddConfig);
        
        //remove anchor
        this.anc.remove();
        this.anc = null;

        //hide unpin tool
        this.tools.unpin.hide();
    },

    /**
     * @private
     * Pans the MapPanel's map so that an anchored popup can come entirely 
     * into view, with padding specified as per normal OpenLayers.Map popup 
     * padding.
     */
    panIntoView: function() {
        var mapBox = Ext.fly(this.map.div).getBox(true); 

        //assumed viewport takes up whole body element of map panel
        var popupPos =  this.getPosition(true);
        popupPos[0] -= mapBox.x;
        popupPos[1] -= mapBox.y;
       
        var panelSize = [mapBox.width, mapBox.height]; // [X,Y]

        var popupSize = this.getSize();

        var newPos = [popupPos[0], popupPos[1]];

        //For now, using native OpenLayers popup padding.  This may not be ideal.
        var padding = this.map.paddingForPopups;

        // X
        if(popupPos[0] < padding.left) {
            newPos[0] = padding.left;
        } else if(popupPos[0] + popupSize.width > panelSize[0] - padding.right) {
            newPos[0] = panelSize[0] - padding.right - popupSize.width;
        }

        // Y
        if(popupPos[1] < padding.top) {
            newPos[1] = padding.top;
        } else if(popupPos[1] + popupSize.height > panelSize[1] - padding.bottom) {
            newPos[1] = panelSize[1] - padding.bottom - popupSize.height;
        }

        var dx = popupPos[0] - newPos[0];
        var dy = popupPos[1] - newPos[1];

        this.map.pan(dx, dy);
    },
    
    /**
     * @private
     */
    onMapMove: function() {
        if (!(this.hidden && this.insideViewport)){       
            this._mapMove = true;
            this.position();
            delete this._mapMove;
        }
    },
    
    /**
     * @private
     */
    addAnchorEvents: function() {
        this.map.events.on({
            "move" : this.onMapMove,
            scope : this            
        });
        
        this.on({
            "resize": this.position,
            "collapse": this.position,
            "expand": this.position,
            scope: this
        });
    },
    
    /**
     * @private
     */
    removeAnchorEvents: function() {
        //stop position with location
        this.map.events.un({
            "move" : this.onMapMove,
            scope : this
        });

        this.un("resize", this.position, this);
        this.un("collapse", this.position, this);
        this.un("expand", this.position, this);
    },

    /**
     * @private
     * Cleanup events before destroying the popup.
     */
    beforeDestroy: function() {
        if(this.getAnchored()) {
            this.removeAnchorEvents();
        }
        this.callParent(arguments);
    }

});