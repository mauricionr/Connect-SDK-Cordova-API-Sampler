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
    name: "DiscoveryManagerController",
    kind: "enyo.Controller",
    
    published: {
        requestPairing: true, // if true, ask for capabilities that require pairing
        autoConnect: true, // if true, connect to last connected device on boot,
        airPlayMirror: true // if true, use mirroring for displaying content on AirPlay
    },
    
    create: function () {
        this.inherited(arguments);
        
        // FIXME: Cordova seems to have problems starting discovery in the same tick.
        // Need to investigate.
        this.startJob("startup", "startDiscovery", 0);
        
        this.inCreate = true;
        this.justStartedApp = true;
        
        // Load settings
        this.set("autoConnect", window.localStorage.getItem("autoConnect") !== "no");
        this.set("requestPairing", window.localStorage.getItem("requestPairing") !== "no");
        this.set("airPlayMirror", window.localStorage.getItem("airPlayMirror") !== "no");
        this.savedDeviceId = window.localStorage.getItem("lastDeviceId") || null;
        
        this.inCreate = false;
    },
    
    requestPairingChanged: function () {
        if (!this.inCreate) {
            window.localStorage.setItem("requestPairing", this.requestPairing ? "yes" : "no");
            this.restartDiscovery();
        }
    },
    
    autoConnectChanged: function () {
        if (!this.inCreate) {
            window.localStorage.setItem("autoConnect", this.autoConnect ? "yes" : "no");
        }
    },
    
    airPlayMirrorChanged: function () {
        if (!this.inCreate) {
            window.localStorage.setItem("airPlayMirror", this.airPlayMirror ? "yes" : "no");
            
            // SDK currently doesn't support changing this at runtime
            this.app.showMessage("Notice", "Please restart the app for the AirPlay mirror mode setting to take effect.");
        }
    },
    
    startDiscovery: function () {
        if (!window.ConnectSDK) {
            console.error("startDiscovery: navigator.ConnectSDK not available");
            return;
        }
        
        ConnectSDK.discoveryManager.startDiscovery({
            pairingLevel: this.requestPairing ? ConnectSDK.PairingLevel.ON : ConnectSDK.PairingLevel.OFF,
            airPlayServiceMode: this.airPlayMirror ? ConnectSDK.AirPlayServiceMode.WEBAPP :
                ConnectSDK.AirPlayServiceMode.MEDIA
        });

        ConnectSDK.discoveryManager.on("devicefound", this.deviceFound, this);
    },
    
    stopDiscovery: function () {
        if (window.ConnectSDK) {
            ConnectSDK.discoveryManager.stopDiscovery();
            
            ConnectSDK.discoveryManager.off("devicefound", this.deviceFound, this);
        }
    },
    
    restartDiscovery: function () {
        this.stopDiscovery();
        this.startDiscovery();
    },
    
    deviceFound: function (device) {
        console.log("device found: " + device.getId());
        
        if (this.justStartedApp && this.savedDeviceId && device.getId() === this.savedDeviceId) {
            this.justStartedApp = false;
            
            this.app.$.deviceController.setPendingDevice(device);
        }
    },
    
    showPicker: function () {
        this.justStartedApp = false;
        
        if (!window.ConnectSDK) {
            this.app.showMessage(
                "Unable to show picker",
                "Connect SDK plugin not available"
            );
            
            return;
        }
        
        this.picker = ConnectSDK.discoveryManager.pickDevice();
        
        this.picker.success(this.pickerSuccess, this);
        this.picker.error(function (err) {
            if (err) {
                console.log("picker error: " + JSON.stringify(err));
                this.app.showError(err);
            } else {
                // if err is undefined, then picker was cancelled
                console.log("picker cancelled");
            }
        }, this);
    },
    
    pickerSuccess: function (device) {
        var deviceController = this.app.$.deviceController;
        
        if (deviceController.pendingDevice) {
            deviceController.setPendingDevice(null);
        }
        
        console.log("selected device in picker");
        deviceController.setPendingDevice(device);
        
        window.localStorage.setItem("savedDeviceId", device.getId());
    }
});

enyo.kind({
    name: "ConnectableDeviceController",
    kind: "enyo.Controller",
    
    published: {
        pendingDevice: null,
        device: null,
        connected: false
    },
    
    pendingDeviceChanged: function (oldDevice) {
        var device = this.pendingDevice;
        
        if (oldDevice) {
            oldDevice.off("ready", this.deviceConnected, this);
            oldDevice.off("disconnect", this.deviceDisconnected, this);
            oldDevice.off("capabilitieschanged", this.deviceCapabilitiesChanged, this);
        }
        
        if (device) {
            device.on("ready", this.deviceConnected, this);
            device.on("disconnect", this.deviceDisconnected, this);
            device.on("capabilitieschanged", this.deviceCapabilitiesChanged, this);
            
            console.log("pending device changed");
            
            if (device.isReady()) {
                console.log("device is already connected");
                this.deviceConnected();
            } else {
                console.log("connecting to device: ", device.getFriendlyName());
                device.connect();
            }
        }
    },
    
    disconnect: function () {
        if (this.device) {
            this.device.disconnect();
        }
        
        if (this.pendingDevice) {
            this.pendingDevice.disconnect();
        }
        
        this.setDevice(null);
        this.setPendingDevice(null);
    },
    
    deviceConnected: function () {
        console.log("device connected");
        var pendingDevice = this.pendingDevice;
        this.pendingDevice = null;
        
        if (pendingDevice) {
            try {
                // Make this the current connected device
                // This will also update any components that are observing
                // this controller's .device property.
                this.setDevice(pendingDevice);
            } catch (e) {
                console.error(e);
                this.app.showError(e);
            }
            this.setConnected(true);
        }
    },
    
    deviceDisconnected: function () {
        console.log("device disconnected");
        this.setDevice(null);
        this.setConnected(false);
    },
    
    deviceCapabilitiesChanged: function () {
        // TODO
        enyo.Signals.send("onDeviceCapabilitiesChanged");
    }
});
