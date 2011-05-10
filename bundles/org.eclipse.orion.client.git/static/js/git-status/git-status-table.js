/******************************************************************************* 
 * Copyright (c) 2009, 2011 IBM Corporation and others.
 * All rights reserved. This program and the accompanying materials are made 
 * available under the terms of the Eclipse Public License v1.0 
 * (http://www.eclipse.org/legal/epl-v10.html), and the Eclipse Distribution 
 * License v1.0 (http://www.eclipse.org/org/documents/edl-v10.html). 
 * 
 * Contributors: IBM Corporation - initial API and implementation
 ******************************************************************************/

var orion = orion || {};

orion.GitStatusModel = (function() {
	function GitStatusModel() {
		this.selectedFileId = undefined;
		this.selectedItem = undefined;
		this.interestedUnstagedGroup = ["Missing","Modified","Untracked","Conflicting"];
		this.interestedStagedGroup = ["Added", "Changed","Removed"];
		this.conflictPatterns = [["Both","Modified","Added", "Changed","Missing"],["RemoteDelete","Untracked","Removed"],["LocalDelete","Modified","Added", "Missing"]];
		this.conflictType = "Conflicting";
	}
	GitStatusModel.prototype = {
		destroy: function(){
		},
		
		interestedCategory: function(){
			
		},
		
		init: function(jsonData){
			this.items = jsonData;
			/*
			for(var i = 0; i < this.conflictPatterns.length ; i++ ){
				this._markConflict(this.conflictPatterns[i]);
			}*/
		},
		
		getModelType: function(groupItem , groupName){
			/*
			if(groupItem.Conflicting){
				if(groupItem.Conflicting === "Hide")
					return undefined;
				else
					return this.conflictType;
			}*/
			return groupName;
		},
		
		_markConflict:function(conflictPattern){
			//if git status server API response a file with "Modified" ,"Added", "Changed","Missing" states , we treat it as a conflicting file
			//And we add additional attribute to that groupItem : groupItem.Conflicting = true;
			var baseGroup = this.getGroupData(conflictPattern[1]);
			if(!baseGroup)
				return;
			for(var i = 0 ; i < baseGroup.length ; i++){
				if(baseGroup[i].Conflicting)
					continue;
				var fileLocation = baseGroup[i].Location;
				var itemsInDetectGroup = [];
				
				for (var j = 2; j < conflictPattern.length ; j++){
					var groupName = conflictPattern[j];
					var groupData = this.getGroupData(groupName);
					if(!groupData)
						continue;
					var item = this._findSameFile(fileLocation , groupData);
					if(item){
						itemsInDetectGroup.push(item);
					} else {
						continue;
					}
				}
				
				//we have the same file at "Modified" ,"Added", "Changed","Missing" groups
				if(itemsInDetectGroup.length === (conflictPattern.length - 2) ){
					baseGroup[i].Conflicting = conflictPattern[0];
					for(var k = 0; k < itemsInDetectGroup.length ; k++){
						itemsInDetectGroup[k].Conflicting = "Hide";
					}
				}
			}
		},
		
		_findSameFile: function(fileLocation , groupData){
			for(var j = 0 ; j < groupData.length ; j++){
				if(groupData[j].Conflicting)
					continue;
				if(fileLocation === groupData[j].Location)
					return groupData[j];
			}
			return undefined;
		},
		
		getGroupData: function(groupName){
			return this.items[groupName];
		},
		
		isConflict: function(type){
			return type === this.conflictType;
		},
		
		isStaged: function(type){
			for(var i = 0; i < this.interestedStagedGroup.length ; i++){
				if(type === this.interestedStagedGroup[i]){
					return  true;
				}
			}
			return false;
		}
		
	};
	return GitStatusModel;
}());

orion.statusTypeMap = { "Missing":["/images/git/git-removed.gif", "Unstaged removal" , "/images/git/git-stage.gif", "Stage" ],
						"Removed":["/images/git/git-removed.gif","Staged removal" ,"/images/git/git-unstage.gif", "Unstage" ],	
						 "Modified":["/images/git/git-modify.gif","Unstaged change" ,"/images/git/git-stage.gif", "Stage" ],	
						 "Changed":["/images/git/git-modify.gif","Staged change" ,"/images/git/git-unstage.gif", "Untage"],	
					     "Untracked":["/images/git/git-added.gif","Unstaged add" ,"/images/git/git-stage.gif", "Stage"],	
						 "Added":["/images/git/git-added.gif","Staged add" ,"/images/git/git-unstage.gif" , "Unstage"],	
						 "Conflicting":["/images/git/conflict-file.gif","Conflicting" ,"/images/git/git-stage.gif" , "Resolve Conflict"]	
					  };


orion.GitStatusRenderer = (function() {
	function GitStatusRenderer(tableDivId , model) {
		this._tableParentDivId = tableDivId;
		this._controller = model;
	}
	GitStatusRenderer.prototype = {
		initTable: function () {
			tableId = this._tableParentDivId + "_table";
		  	var tableParentDomNode = dojo.byId( this._tableParentDivId);
			dojo.place(document.createTextNode(""), tableParentDomNode, "only");
			
		  	var table = document.createElement('table');
			table.id = tableId;
			table.width = "100%";
			tableParentDomNode.appendChild(table);
			this._table = table;
		},
		
		renderRow: function(itemModel) {
			var self = this;
			var row = document.createElement('tr');
			row.id = itemModel.name +"_row";
			row._item = itemModel;
			this._table.appendChild(row);

			//render the type icon (added , modified ,untracked ...)
			var typeColumn = document.createElement('td');
			var typeImg = document.createElement('img');
			typeImg.src = orion.statusTypeMap[itemModel.type][0];
			typeColumn.appendChild(typeImg);
			row.appendChild(typeColumn);
			
			//render the file name field
			var nameColumn = document.createElement('td');
			nameColumn.width="100%";
			nameColumn.noWrap= true;
			row.appendChild(nameColumn);
			
			var nameSpan =  document.createElement('span');
			nameSpan.id = itemModel.name + "_" + itemModel.type +  "_nameSpan";
			dojo.place(document.createTextNode(itemModel.name), nameSpan, "only");
			nameSpan.style.color = "#0000FF";
			nameSpan.title = "Click to compare";
			nameColumn.appendChild(nameSpan);
			if(nameSpan.id === self._controller._model.selectedFileId ){
				self._controller._model.selectedItem = itemModel;
				dojo.toggleClass(nameSpan, "fileNameSelectedRow", true);
			}
			
			dojo.connect(nameSpan, "onmouseover", nameSpan, function() {
				nameSpan.style.cursor = self._controller.loading ? 'wait' :"pointer";
				dojo.toggleClass(nameSpan, "fileNameCheckedRow", true);
			});
			dojo.connect(nameSpan, "onmouseout", nameSpan, function() {
				nameSpan.style.cursor = self._controller.loading ? 'wait' :"default";
				dojo.toggleClass(nameSpan, "fileNameCheckedRow", false);
			});
			
			dojo.connect(nameSpan, "onclick", nameSpan, function() {
				if(itemModel.name !== self._controller._model.selectedFileId ){
					if(self._controller._model.selectedFileId !== undefined){
						var selected = document.getElementById(self._controller._model.selectedFileId);
						if(selected)
							dojo.toggleClass(selected, "fileNameSelectedRow", false);
					}
					self._controller.cursorWait(nameSpan , true);
					dojo.toggleClass(nameSpan, "fileNameSelectedRow", true);
					self._controller._model.selectedFileId = nameSpan.id;
					self._controller.loadDiffContent(itemModel);
				}
			});
			
			//render the side by side viewer icon
			sbsViewerCol = document.createElement('td');
			row.appendChild(sbsViewerCol);
			this._controller.createImgButton(false ,sbsViewerCol , "/images/git/compare-sbs.gif", "Side by side compare",
					function(evt) {
						self._controller.openCompareEditor(itemModel);
					} );
			
			//render the stage / unstage action  icon
			if(this._controller._model.isStaged(itemModel.type)){
				this._controller.hasStaged = true;
				return;
			} else {
				this._controller.hasUnstaged = true;
			}
			stageCol = document.createElement('td');
			row.appendChild(stageCol);
			this._controller.createImgButton(true ,stageCol , orion.statusTypeMap[itemModel.type][2], orion.statusTypeMap[itemModel.type][3],
					function(evt) {
						self._controller.doAction(itemModel);
					} );
		}
	};
	return GitStatusRenderer;
}());

orion.GitStatusController = (function() {
	function GitStatusController(serviceRegistry , unstagedDivId , stagedDivId) {
		this._registry = serviceRegistry;
		this._model = new orion.GitStatusModel();
		this._unstagedTableRenderer = new orion.GitStatusRenderer(unstagedDivId , this);
		this._stagedTableRenderer = new orion.GitStatusRenderer(stagedDivId , this);
		this._inlineCompareContainer = new orion.InlineCompareContainer(serviceRegistry ,"inline-compare-viewer");
		self._stagingConflict = false;
	}
	GitStatusController.prototype = {
		loadStatus: function(jsonData){
			this._model.init(jsonData);
			this.initViewer();
			this._model.selectedFileId = null;
			this._loadBlock(this._unstagedTableRenderer , this._model.interestedUnstagedGroup);
			this._loadBlock(this._stagedTableRenderer , this._model.interestedStagedGroup);
			
			var self = this;
			var messageArea = document.getElementById("commitMessage");
			messageArea.disabled = !this.hasStaged;
			
			var stageAllBtn = document.getElementById("stageAll");
			var unstageAllBtn = document.getElementById("unstageAll");
			var commitBtn = document.getElementById("commit");
			var amendBtn = document.getElementById("amend");
			
			this.modifyImageButton(true ,stageAllBtn , "Stage all", function(evt){self.stageAll();} , !this.hasUnstaged);
			this.modifyImageButton(true ,unstageAllBtn , "Unstage all", function(evt){self.unstageAll();} , !this.hasStaged);
			this.modifyImageButton(true ,commitBtn , "Commit staged files", function(evt){self.commit(messageArea.value);} , !this.hasStaged , function(){return (messageArea.value === undefined || messageArea.value === null || messageArea.value === "");});
			this.modifyImageButton(false ,amendBtn , "Amend last commit", function(evt){self.commit(messageArea.value , true);} , !this.hasStaged, function(){return (messageArea.value === undefined || messageArea.value === null || messageArea.value === "");});
			
			if(this._stagingConflict){
				this._stagingConflict = false;
				if(!this.hasStaged){
					this.commit("Resolved deletion conflicts on file " + this._stagingName, false);
				}
			}
			
			this.cursorClear();
		},
		
		cursorWait: function(currentDiv , remember){
			this.loading = true;
			document.body.style.cursor = 'wait';
			if(currentDiv)
				currentDiv.style.cursor = 'wait';
			if(remember)
				this.currentDiv = currentDiv;
		},
		
		cursorClear: function() {
			this.loading = false;
			document.body.style.cursor = 'default';
			if(this.currentDiv)
				this.currentDiv.style.cursor = 'default';
			this.currentDiv = undefined;
		},
		
		initViewer: function () {
		  	this._inlineCompareContainer.destroyEditor();
			this._model.selectedItem = null;
			this.hasStaged = false;
			this.hasUnstaged = false;
			dojo.place(document.createTextNode("Select a file on the left to compare..."), "fileNameInViewer", "only");
			dojo.style("fileNameInViewer", "color", "#6d6d6d");
		},

		createImgButton: function(enableWaitCursor ,imgParentDiv , imgSrc, imgTitle,onClick){
			var imgBtn = document.createElement('img');
			imgBtn.src = imgSrc;
			imgParentDiv.appendChild(imgBtn);
			this.modifyImageButton(enableWaitCursor ,imgBtn , imgTitle,onClick);
		},
		
		modifyImageButton: function(enableWaitCursor , imgBtnDiv , imgTitle, onClick , disabled , onHoverCallBack){
			var self = this;
			if(disabled === undefined || !disabled){
				imgBtnDiv.title= imgTitle;
				
				dojo.style(imgBtnDiv, "opacity", "0.4");
				dojo.connect(imgBtnDiv, "onmouseover", imgBtnDiv, function() {
					//console.log( "onmouseover : " + self.loading );
					var disableOnHover = false;
					if(onHoverCallBack)
						disableOnHover = onHoverCallBack();
					imgBtnDiv.style.cursor = self.loading ? 'wait' : (disableOnHover ? "default" : "pointer");
					if(disableOnHover)
						dojo.style(imgBtnDiv, "opacity", "0.4");
					else
						dojo.style(imgBtnDiv, "opacity", "1");
				});
				dojo.connect(imgBtnDiv, "onmouseout", imgBtnDiv , function() {
					//console.log( "onmouseout : " + self.loading );
					imgBtnDiv.style.cursor = self.loading ? 'wait' : "default";
					dojo.style(imgBtnDiv, "opacity", "0.4");
				});
				imgBtnDiv.onclick = function(evt){
					var disableOnHover = false;
					if(onHoverCallBack)
						disableOnHover = onHoverCallBack();
					if(enableWaitCursor && !disableOnHover)
						self.cursorWait(imgBtnDiv , true) ;
					if(!disableOnHover)
						onClick(evt);
				};
			} else {
				imgBtnDiv.title= "";
				imgBtnDiv.style.cursor =  self.loading ? 'wait' : "default";
				dojo.style(imgBtnDiv, "opacity", "0.0");
				dojo.connect(imgBtnDiv, "onmouseover", imgBtnDiv, function() {
					imgBtnDiv.style.cursor = self.loading ? 'wait' : "default";
					dojo.style(imgBtnDiv, "opacity", "0");
				});
				dojo.connect(imgBtnDiv, "onmouseout", imgBtnDiv , function() {
					imgBtnDiv.style.cursor = self.loading ? 'wait' : "default";
					dojo.style(imgBtnDiv, "opacity", "0");
				});
				imgBtnDiv.onclick = null;
			}
		},
		
		_sortBlock: function(interedtedGroup){
			var retValue = [];
			for (var i = 0; i < interedtedGroup.length ; i++){
				var groupName = interedtedGroup[i];
				var groupData = this._model.getGroupData(groupName);
				if(!groupData)
					continue;
				for(var j = 0 ; j < groupData.length ; j++){
					var renderType = this._model.getModelType(groupData[j] , groupName);
					if(renderType){
						retValue.push({name:groupData[j].Name, 
											type:renderType, 
											location:groupData[j].Location,
											commitURI:groupData[j].Git.CommitLocation,
											indexURI:groupData[j].Git.IndexLocation,
											diffURI:groupData[j].Git.DiffLocation,
											conflicting:groupData[j].Conflicting 
						});
					}
				} 
			}
			retValue.sort(function(a, b) {
				var n1 = a.name && a.name.toLowerCase();
				var n2 = b.name && b.name.toLowerCase();
				if (n1 < n2) { return -1; }
				if (n1 > n2) { return 1; }
				return 0;
			}); 
			return retValue;
		},
			
		
		_loadBlock: function(renderer , interedtedGroup){
			renderer.initTable();
			var retValue = this._sortBlock(interedtedGroup);
			for (var i = 0; i < retValue.length ; i++){
				renderer.renderRow(retValue[i]);
			}
		},
		
		loadDiffContent: function(itemModel){
			this.cursorWait();
			var self = this;
			var diffVS = this._model.isStaged(itemModel.type) ? "index VS HEAD ) " : "local VS index ) " ;
			var message = "Compare( " + orion.statusTypeMap[itemModel.type][1] + " : " +diffVS ;
			
			var diffURI = (this._model.isConflict(itemModel.type) ? itemModel.diffURI : itemModel.diffURI + "?conflict=true");
			this._inlineCompareContainer.resolveDiff(diffURI + "?conflict=true",
					                                function(newFile , OldFile){					
														dojo.place(document.createTextNode(message), "fileNameInViewer", "only");
														dojo.style("fileNameInViewer", "color", "#6d6d6d");
														self.cursorClear();
													},
													function(response, ioArgs){
														self.handleServerErrors(response , ioArgs);
													}
			);
		},
		
		openCompareEditor: function(itemModel){
			var diffParam = "";
			var baseUrl = "/compare-m.html#";
			if(this._model.isConflict(itemModel.type)){
				diffParam = "?conflict=true";
			}
			if(this._model.isStaged(itemModel.type)){
				baseUrl = "/compare-m.html?readonly#";
			}
			var url = baseUrl + itemModel.diffURI + diffParam;
			window.open(url,"");
		},
		
		doAction: function(itemModel){
			if(this._model.isStaged(itemModel.type))
				this.unstage(itemModel.indexURI);
			else
				this.stage(itemModel.indexURI , itemModel);
		},
		
		handleServerErrors: function(errorResponse , ioArgs){
			var message = typeof(errorResponse.message) === "string" ? errorResponse.message : ioArgs.xhr.statusText; 
			dojo.place(document.createTextNode(message), "fileNameInViewer", "only");
			dojo.style("fileNameInViewer", "color", "red");
			this.cursorClear();
		},
		
		getGitStatus: function(url){
			this._url = url;
			this.cursorWait();
			var self = this;
			self._registry.getService("IGitService").then(
				function(service) {
					service.getGitStatus(url, 
										 function(jsonData, secondArg) {
										 	 self.loadStatus(jsonData);
										 },
										 function(response, ioArgs){
											 self.handleServerErrors(response, ioArgs);
										 }
					);
				});
		},
		
		stage: function(location , itemModel){
			var self = this;
			if(itemModel && itemModel.conflicting){
				self._stagingConflict = true;
				self._stagingName = itemModel.name;
			}
			else
				self._stagingConflict = false;
			self._registry.getService("IGitService").then(
					function(service) {
						service.stage(location, 
											 function(jsonData, secondArg) {
											 	 self.getGitStatus(self._url);
											 },
											 function(response, ioArgs){
												 self.handleServerErrors(response, ioArgs);
											 }
						);
					});
		},
		
		stageAll: function(){
			this.stage(this._model.items.IndexLocation);
		},
		
		unstage: function(location){
			var self = this;
			self._registry.getService("IGitService").then(
					function(service) {
						service.unstage(location, 
											 function(jsonData, secondArg) {
											 	 self.getGitStatus(self._url);
											 },
											 function(response, ioArgs){
												 self.handleServerErrors(response, ioArgs);
											 }
						);
					});
		},
		
		unstageAll: function(){
			this.unstage(this._model.items.IndexLocation);
		},
		
		commitAll: function(location , message , body){
			var self = this;
			self._registry.getService("IGitService").then(
					function(service) {
						service.commitAll(location,  message , body,
											 function(jsonData, secondArg) {
											 	 self.getGitStatus(self._url);
											 },
											 function(response, ioArgs){
												 self.handleServerErrors(response, ioArgs);
											 }
						);
					});
		},
		
		commit: function(message , amend){
			this.commitAll(this._model.items.CommitLocation , message , amend ?dojo.toJson({"Message":message,"Amend":"true"}): dojo.toJson({"Message":message}));
		}
		
	};
	return GitStatusController;
}());

