//
//  Connect SDK Cordova API Sampler by LG Electronics
//
//  To the extent possible under law, the person who associated CC0 with
//  this sample app has waived all copyright and related or neighboring rights
//  to the sample app.
//
//  You should have received a copy of the CC0 legalcode along with this
//  work. If not, see http://creativecommons.org/publicdomain/zero/1.0/.
//

enyo.kind({
    name: "LauncherPanel",
    kind: "CapabilityPanel",
    
    components: [
        {kind: "TabPanels", classes: "enyo-fit", components: [
            {tabLabel: "Common Apps", controlClasses: "margin", components: [
                {kind: "LaunchContentButton", appName: "Browser", paramLabel: "URL", param: "http://"},
                {kind: "LaunchContentButton", appName: "Hulu", paramLabel: "Content Id"},
                {kind: "LaunchContentButton", appName: "Netflix", paramLabel: "Content Id"},
                {kind: "LaunchContentButton", appName: "YouTube", paramLabel: "Content Id", param: "ZwwS4YOTbbw"},
            ]},
            {tabLabel: "App List", name: "appList", kind: "enyo.DataList", classes: "enyo-fit", components: [
                {kind: "onyx.Item", ontap: "launchApp", components: [
                    {name: "appName"}
                ], bindings: [
                    {from: ".model.name", to: ".$.appName.content"}
                ]}
            ]}
        ]},
        {name: "apps", kind: "enyo.Collection"}
    ],
          
    bindings: [
        {from: ".$.apps", to: ".$.appList.collection"}
    ],
        
    deviceConnected: function (device) {
        device.getLauncher().getAppList().complete(function (err, data) {
            this.$.apps.reset(data || []);
        }, this);
    },
     
    launchApp: function (sender, event) {
        var app = this.$.apps.at(event.index);
        
        var appId = app && app.get("id");
        
        if (appId) {
            this.device.getLauncher().launchApp(appId).success(function () {
                this.app.showMessage("Success", "Launched " + appId);
            }, this).error(function (err) {
                this.app.showError(err);
            }, this);
        }
    }
});

enyo.kind({
    name: "LaunchContentButton",
    kind: "enyo.FittableColumns",
    
    controlClasses: "inline-block",
    
    published: {
        device: null,
        appName: "",
        title: "",
        paramLabel: "Content ID:",
        param: "",
        command: "",
        capability: ""
    },
    
    components: [
        {kind: "onyx.Button", ontap: "launch", components: [
            {name: "title"},
            
            // Shows whether device supports launching this app
            {name: "support", kind: "CapabilitySupport", short: true, style: "margin-left: 0.5em"}
        ]},
        {kind: "onyx.InputDecorator", layoutKind: "enyo.FittableColumnsLayout", classes: "indent hmargin", fit: true, components: [
            // Input field for contentId/URL
            {name: "param", kind: "onyx.Input", fit: true,
             attributes: {autocomplete: "false", autocapitalize: "false"}},
            
            // Shows whether device supports deep-linking this app (launching with params)
            {name: "paramSupport", kind: "CapabilitySupport", short: true}
        ]}
    ],
         
    bindings: [
        {from: ".owner.device", to: ".device"},
        {from: ".title", to: ".$.title.content"},
        {from: ".paramLabel", to: ".$.param.placeholder"},
        {from: ".param", to: ".$.param.value", oneWay: false},
        {from: ".capability", to: ".$.support.capability"},
        {from: ".paramCapability", to: ".$.paramSupport.capability"}
    ],
    
    create: function () {
        this.inherited(arguments);
        
        if (this.appName) {
            !this.title && this.set("title", "Launch " + this.appName);
            !this.command && this.set("command", "launch" + this.appName);
            !this.capability && this.set("capability", "Launcher." + this.appName);
        }
        
        if (this.capability) {
            !this.paramCapability && this.set("paramCapability", this.capability + ".Params");
        }
    },
    
    launch: function () {
        var request = this.device.getLauncher()[this.command](this.param)
        
        request.success(function () {
            this.app.showMessage("success", "Launched");
        }, this).error(function (err) {
            this.app.showError(err);
        }, this);
        
        return true;
    }
});