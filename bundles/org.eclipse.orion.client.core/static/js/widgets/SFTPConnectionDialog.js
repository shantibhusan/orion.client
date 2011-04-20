/*******************************************************************************
 * Copyright (c) 2011 IBM Corporation and others. All rights reserved. This
 * program and the accompanying materials are made available under the terms of
 * the Eclipse Public License v1.0 which accompanies this distribution, and is
 * available at http://www.eclipse.org/legal/epl-v10.html
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/
/*global dojo dijit localStorage */
/*jslint browser:true*/
dojo.provide("widgets.SFTPConnectionDialog");

dojo.require("dijit.Dialog");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.form.ComboBox");
dojo.require("dojo.data.ItemFileReadStore");

if (!localStorage.getItem("orion.sftpConnections")) {
	var defaultItems = { 
		identifier: 'name',
		label: 'name',
		items: []
	};
	localStorage.setItem("orion.sftpConnections", JSON.stringify(defaultItems));
}

var sftpConnectionStoreData= JSON.parse(localStorage.getItem("orion.sftpConnections"));

/**
 * @param options {{ 
 *     title: string,
 *     label: string,
 *     func: function,
 *     [advanced]: boolean  // Whether to show advanced controls. Default is false
 * }}
 */
dojo.declare("widgets.SFTPConnectionDialog", [dijit.Dialog], {
	widgetsInTemplate: true,
	templateString: dojo.cache("widgets", "templates/SFTPConnectionDialog.html"),
	
	constructor : function() {
		this.inherited(arguments);
		this.options = arguments[0] || {};
	},
	postMixInProperties : function() {
		this.inherited(arguments);
		this.title = "SFTP Transfer";
		this.sftpHostLabelText= "Remote host:";
		this.sftpPathLabelText= "Remote path:";
		this.sftpUserLabelText= "User name:";
		this.sftpPasswordLabelText= "Password:";
		this.buttonCancel = "Cancel";
		this.buttonOk = "Start Transfer";
		this.locationLabelText = "Location:";
		sftpConnectionStoreData= JSON.parse(localStorage.getItem("orion.sftpConnections"));
	},
	postCreate: function() {
		this.inherited(arguments);
		dojo.connect(this, "onKeyPress", dojo.hitch(this, function(evt) {
			if (evt.keyCode === dojo.keys.ENTER) {
				this.domNode.focus(); // FF throws DOM error if textfield is focused after dialog closes
				this._onSubmit();
			}
		}));
		dojo.connect(this.addSFTPConnection, "onClick", null, dojo.hitch(this, this.onAddConnection));

		this.refocus = false; 
	},
    onHide: function() {
		// This assumes we don't reuse the dialog
		this.inherited(arguments);
		setTimeout(dojo.hitch(this, function() {
			this.destroyRecursive(); // TODO make sure this removes DOM elements
		}), this.duration);
	},
	execute: function() {
		var selected = this.sftpConnectionList.value;
		var splits = selected.split("@");
		var user = splits[0];
		var separator = splits[1].indexOf("/");
		var host = splits[1].substring(0, separator);
		var path = splits[1].substring(separator);
		this.options.func(host, path, user, this.sftpPassword.value);
	},
	onAddConnection: function() {
		var newConnection = {name: this.sftpUser.value+"@"+this.sftpHost.value+this.sftpPath.value};
		var connections = JSON.parse(localStorage.getItem("orion.sftpConnections"));
		//make sure we don't already have an entry with this name
		var found = false;
		for (var i = 0; i < connections.items.length; i++) {
			if (connections.items[i].name == newConnection.name) {
				found = true;
				break;
			}
		}
		//if we have a new value, add it to the list and to the storage
		if (!found) {
			connections.items.unshift(newConnection);
			localStorage.setItem("orion.sftpConnections", JSON.stringify(connections));
			this.sftpConnectionList.set("value", newConnection.name);
		}
	}
});