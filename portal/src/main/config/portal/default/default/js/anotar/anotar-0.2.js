/*
 * Anotar - Javascript Client Library v0.2
 * Copyright (C) 2010 University of Southern Queensland
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */
function anotarFactory(jQ, config) {
    /*
     * Required configuration parameters: docRoot serverAddress pageUri
     */
    var anotar = {};
    if(!config) config={};
    // default settings
    config.docRoot = config.docRoot || "#anno-root";
    config.tagList = config.tagList || "p, h1, h2, h3, h4, h5, h6";
    config.listElementTagNames = config.listElementTagNames || "li,lh,dd,dt"; // list of list elements defined
    config.label = config.label || "Comment on this:";
    config.lang = config.lang || "en";
    config.creatorUri = config.creatorUri || "http://www.purl.org/anotar/ns/user/0.1#Anonymous";
    config.clientUri = config.clientUri || "http://www.purl.org/anotar/client/0.1";
    config.stylePrefix = config.stylePrefix ||  "anno-";
    config.interfaceLabel = config.interfaceLabel || " &#xb6;";
    config.interfaceVisible = config.interfaceVisible || false;
    config.replyLabel = config.replyLabel || "[reply]";
    config.contentInput = config.contentInput || "textArea";
    config.getContentUri = config.getContentUri || null;
    config.hashAttr = config.hashAttr || "anotar-hash";
    config.hashType = config.hashType || "http://www.purl.org/anotar/locator/0.1";
    config.hashFunction = config.hashFunction || null;
    config.uriAttr = config.uriAttr || "id";
    config.disableReply = config.disableReply || false;
    
    //switch to autoset page uri
    config.setPageUriOnLoad = config.setPageUriOnLoad || false;
    
    // function overwritten
    config.submitAnnotation = config.submitAnnotation || postNewAnnotation;
    config.loadAnnotation = config.loadAnnotation || loadAnnotation;
    config.loadAnnotations = config.loadAnnotations || loadAnnotations;
    config.getHttpData = config.getHttpData || getHttpData;
    config.postHttpData = config.postHttpData || postHttpData;
    
    annotationType = config.annotationType || "comment";
    setType(annotationType);        // sets config.annoType
    anotar.config = config;
    
    // Checks
    if (config.docRoot.length == 0)
        debug.die("No document root (" + config.docRoot + ") found!");
    // If we haven't been given a URI or a way to find URIs then use the current
    // URL.
    // if(!config.pageUri) config.pageUri = location.href; // Not good (HACK)
    
    var anotarForm;
    /*
     * ################## Other Options #################
     * 
     * ----- Debug ----- "debug" : false,
     * 
     * ----- Setting ----- 
     * "serverAddress" : null, 
     * "proxyRequired" : false,
     * "proxyUrl" : null, 
     * "creator" : null, 
     * "creatorEmail": null,
     * "creatorWebsite":null, 
     * "uriAttr" : "id" //to look for element's id
     * 
     * ----- Private/Public setting ----- 
     * usePrivacy : false, 
     * privacyClassName : "privacy",
     * 
     * ----- form ----- 
     * "formPrepend" : false, 
     * "formCustom" : null, 
     * "formCancel" : null, 
     * "formSubmit" : null, 
     * "formClear" : null, 
     * "formClose" : null,
     * formCancelFunction : null, 
     * formClearFunction : null, 
     * formCloseFunction : null, 
     * formSubmitFunction : null, 
     * formPopup : false 
     * formPopupSettings : {
     *             autoOpen: true, 
     *             bgiframe: false, 
     *             buttons: {}, 
     *             closeOnEscape: true,
     *             closeText: 'close', 
     *             dialogClass: '', 
     *             draggable: true, 
     *             hide: null, 
     *             height: 'auto', 
     *             maxHeight: false, 
     *             maxWidth: false, 
     *             minHeight: 150, 
     *             minWidth: 150,
     *             modal: false, 
     *             position: 'center', 
     *             resizable: true, 
     *             show: null, 
     *             stack: true, 
     *             title: '', 
     *             width: 300, 
     *             zIndex: 1000 
     *        }
     * 
     * ----- Interface ----- 
     * collapseComments : false, 
     * showHideFunction : showHideNode, //see in loadAnnotation
     * 
     * ----- Others ----- 
     * "orphanHolder": null, 
     * "orphanHolder_id": null,
     */

    var debug;
    if(config.debug){
        debug = {die:function(message){ alert("DEBUG: " + message); }}
    }else{
        debug = {die:function(message){}}
    }
    // to make the anotar classnames.
    function getClassSelector(name) { return "."+ getClassName(name); }
    function getClassName(name) { return config.stylePrefix + name;  }
    
    // Variables accessible throughout this object
    var errorMsg = "";
    var templateCache = {};
    var anonUri = "http://www.purl.org/anotar/ns/user/0.1#Anonymous";
    var targetList = [];
    var docRoot = jQ(config.docRoot);

    // =======================================
    // Default Templates
    // =======================================
    var templates = {
        commandText: "<span class='<%=style%>command'><%=label%></span>",
    
        annotateForm:
             "<div class='<%=style%>annotate-form'>" +
               "<div class='<%=style%>annotate-form-elements'>" +
                 "<textarea class='<%=style%>annotate-text'></textarea><br/>" +
                 "<button class='<%=style%>cancel'>Cancel</button> " +
                 "<button class='<%=style%>submit'>Submit</button> " +
               "</div>" +
               "<span class='<%=style%>info'></span>" +
             "</div>",
        annotateTitle: "<div class='<%=style%>app-label'><%=label%></div>",
        annotateWrap: "<div class='<%=style%>inline-annotation-form'/>",
        annotateQuote: "<blockquote class='<%=style%>inline-annotation-quote'/>",
    
        replyButton: "<button class='<%=style%>reply'>Reply</button>",
    
        commentDisplay:
             "<div class='<%=style%>inline-annotation <%=toggle%>' id='<%=id%>'>" +
                 "<input name='rootUri' value='<%=root%>' type='hidden'/>" +
                 "<div class='<%=style%>orig-content' style='display:none;'><%=original%></div>" +
                 "<div class='<%=style%>anno-info'>" +
                     "Comment by: <span class='<%=style%>anno-creator'><%=creator%></span>" +
                     " &nbsp; <span class='<%=style%>anno-date timeago' title='<%=date%>'><%=date%></span>" +
                 "</div>" +
                 "<div class='<%=style%>anno-content'><%=content%></div>" +
                 "<div class='<%=style%>anno-children'><%=children%></div>" +
             "</div>",
        
        showHideButton :"<a href='' class='<%=style%>showHideComments'>[<span class='<%=style%>showHideText' /> " +
                    "<span class='<%=style%>annotationCount'><%=count%></span> comment(s)...]</a>",
        commentContainer : "<div class='<%=style%>has-annotation' <%=style%>locatorhash='<%=hash%>' />",
        commentList : "<div class='<%=style%>commentList'></div>",
             
        seeAlsoDisplay: "",
        questionDisplay: "",
        explanationDisplay: "",
        exampleDisplay: "",
        changeDisplay: "",
        adviceDisplay: "",
        tagDisplay: "<span class='<%=style%>tag'><%=content%><% if(tagCount > 1){ %> (<%=tagCount%>)<% } %></span>",
        highlightDisplay: "",
    
        orphanHolder: "<p id='<%=style%>orphans'>Below are annotations that we can no longer attach to this document reliably because the data has changed.</p>"
    }
    // Core logic
    //default set pageUri function if not set yet. not to include hash
    if (!config.pageUri && config.setPageUriOnLoad)  config.pageUri = window.location.href.split("#",1)[0];
    targetList = findAnnotatables();
    anotarForm = anotarFormFactory(config);
    addIds(targetList);
    addCommands(targetList);
    config.loadAnnotations();
    
    // Public functions
    function setType(value){
        switch (value.toLowerCase()) {
            case "seealso":     value = "http://www.w3.org/2000/10/annotationType#SeeAlso";     break;
            case "question":    value = "http://www.w3.org/2000/10/annotationType#Question";    break;
            case "explanation": value = "http://www.w3.org/2000/10/annotationType#Explanation"; break;
            case "example":     value = "http://www.w3.org/2000/10/annotationType#Example";     break;
            case "comment":     value = "http://www.w3.org/2000/10/annotationType#Comment";     break;
            case "change":      value = "http://www.w3.org/2000/10/annotationType#Change";      break;
            case "advice":      value = "http://www.w3.org/2000/10/annotationType#Advice";      break;
            case "tag":         value = "http://www.purl.org/anotar/ns/type/0.1#Tag";           break;
            case "highlight":   value = "http://www.purl.org/anotar/ns/type/0.1#Highlight";     break;
            default: break;
        }
        config.annoType = value;
    }
    anotar.setType = setType;


    // Private functions
    function findAnnotatables() {
        // Get all child-nodes with valid selectors of docRoot
        var list = [];
        docRoot.find(config.tagList).each(function(count, item) {
            if (item.innerHTML != "") list.push(item);
        });
        return list; 
    }
    
    
    function addId(node){
        if (!addId.crcs) addId.crcs = {};
        var  crc, c;
        if(!node.attr(config.hashAttr)){
           // Get the contents
            c = node.text();
            c = c.replace(/\s+/g," "); // replace multiple white spaces with
                                        // single space.
           // Hash the contents
            crc = Crc32(c).toLowerCase();
            // Just in case there are identical paragraphs
            if(addId.crcs[crc]){
                addId.crcs[crc].push(true); 
                c = addId.crcs[crc].length;
            }else{
                addId.crcs[crc] = [true];
                c = 1;
            }
            // Attach it to the DOM
            node.attr(config.hashAttr, "h" + crc + "p" + c);
        }    
    }
    function addIds(targetList) {
        // For every target, add an id
        jQ.each(targetList, function(c, i){
            addId(jQ(i));
        });
    }
   
    function addCommand(node){
        if(!addCommand.interfaceSpan){ // set up the spans if not there.
            // reply interface span only if defined
            if (config.replyLabel && !config.disableReply) {
                var replyInterfaceLabel = renderTemplate(config.replyLabel,{style: config.stylePrefix});
                var opt = {style: config.stylePrefix, label: replyInterfaceLabel};
                addCommand.replySpan = jQ(renderTemplate(templates.commandText, opt));
            }
            // general interface span
            opt = {style: config.stylePrefix, label: config.interfaceLabel};
            addCommand.interfaceSpan = jQ(renderTemplate(templates.commandText, opt));
        }
        var prepend = config.interfacePrepend;
        var iNode = addCommand.interfaceSpan;
        var visible = config.interfaceVisible;
        if(node.hasClass(getClassName("inline-annotation"))){
            prepend = true;
            iNode = addCommand.replySpan;
            visible = true;
        }
        var addInterface = function(jqe) {
            if(prepend){
                jqe.prepend(iNode);
            }else{
                if(jqe.children(getClassSelector("has-annotation")).size()!=0){ // in case of list elements
                    jqe.children(getClassSelector("has-annotation")).before(iNode);
                }else{
                    jqe.append(iNode);
                }
            }
            iNode.unbind();
            iNode.mousedown(function(e) {return false;});
            iNode.mouseup(interfaceClick);
        }
        var interfaceClick = function(e) {
            // Find the parent that is tagged
            var me = jQ(e.target).closest('[' + config.hashAttr + ']');
            if(me.size()>0) {
                anotarForm.annotate(me);
            }
            // Now Remove the interface (if dynamic)
            if(!config.interfaceVisible) removeInterface();
            return false;
        }
        var removeInterface = function() {
            iNode.remove();
        }
        if(visible){        // Commands always visible
            var newSpan = iNode.clone();
            newSpan.mousedown(function(e) {return false;});
            newSpan.mouseup(interfaceClick); // for I.E.
            if(prepend){ 
                node.prepend(newSpan);
            } else {
                node.append(newSpan);
            }
        } else {    // if hover
            node.hover(function(e) {addInterface(node);},function(e) {removeInterface();})
            node.mousedown(function(e) {removeInterface();});
        }
    }
    
    function addCommands(targetList) {
        jQ.each(targetList, function(c,i){
            var node=jQ(i);
            // if does not already have a command, then add a new one
            if(node.find(".anno-command").size()===0){
                addCommand(node);
            }
        });
    }

    // Annotation retrieval
    function loadAnnotations() {
        function callback(data, status){
            if(!data){
                alert("Error in Load Annotations: No Data.");
                return;
            }
            var json;
            try{
                json = JSON.parse(data);
                // load each annotations
                jQ.each(json, function(c, i){config.loadAnnotation(i);});
            }catch(e){ 
                alert("JSON ERROR: " + e);
            }
        }
        if (config.pageUri) {
            getAnnotations(config.pageUri, callback);
        } else {
            jQ.each(targetList, function(count, item) {
            var uri = $(item).attr(config.uriAttr);
            getAnnotations(uri, callback);
            });
        }
    }
    
    function loadAnnotation(annoObj) {
        var annoUri = annoObj.annotates.uri;
        var locators = annoObj.annotates.locators || [];
        var annoHash = null;
        var node, isReply;
        function collapseButton(commentContainer){ // add or update the
            // show/hide button
            if(config.collapseComments){
                var commentCount, aNode;
                commentCount = commentContainer.find(getClassSelector("inline-annotation")).size();
                aNode =commentContainer.find(getClassSelector("showHideComments")); 
                if(aNode.size()===0){ // add new
                    aNode = jQ(renderTemplate(templates.showHideButton,{style:config.stylePrefix,count:commentCount}));
                    commentContainer.prepend(aNode);
                    function showHideNode(e){
                        var node,target;
                        //target can be a.anno-showHideComments, span.anno-showHideText or span.anno-annotationCount
                        //so make sure it is always a.anno-showHideComments
                        target = jQ(e.target).closest(getClassSelector("showHideComments"));
                        node = target.parent().find(getClassSelector("commentList"));
                        if(node.is(":visible")){
                            node.hide();
                            target.find(getClassSelector("showHideText")).html("View");
                        }else{
                            node.show();
                            target.find(getClassSelector("showHideText")).html("Hide");
                        }
                        return false;
                    }
                    config.showHideFunction = config.showHideFunction || showHideNode;
                    aNode.click(config.showHideFunction);
                    aNode.click(); // hide the node
                }else{// update the count
                    aNode.find(getClassSelector("annotationCount")).html(commentCount);
                }
            }
        }
        var attachAnnotation = function(node, annotation, isReply) {
            var wrapClass, hash,tagName, commentContainer;
            if (config.outputInChild){ // Mainly for tags
                node.find(config.outputInChild).append(annotation);
            } else {
                if (isReply) { 
                    if(!node.hasClass(getClassName("anno-children"))){  // just in case wrong parent
                        node = node.children(getClassSelector("anno-children"));
                    }
                    node.append(annotation);
                    
                } else { // adding new annotation
                    wrapClass = getClassName("has-annotation");
                    hash = node.attr(config.hashAttr);
                    commentContainer = docRoot.find("["+config.stylePrefix +"locatorhash='"+hash+"']");
                    if(commentContainer.size() === 0) {  // Make a container for the comments
                        tagName = node[0].tagName.toLowerCase();
                        commentContainer = jQ(renderTemplate(templates.commentContainer,{style: config.stylePrefix, hash:hash}));
                        commentContainer.append(renderTemplate(templates.commentList,{style:config.stylePrefix}));
                        if(config.listElementTagNames.search(tagName) === -1){ // if not list,then add as a sibling
                             node.after(commentContainer);
                        }else{// otherwise, add as a child
                            node.append(commentContainer);
                        }
                    } 
                    commentContainer.children(getClassSelector("commentList")).append(annotation);
                }
            }
            if(!commentContainer){
                commentContainer = annotation.closest(getClassSelector("has-annotation"));
            }
            collapseButton(commentContainer); // modify show/hide button
        }
        
        // Find where to attach it
        if (config.pageUri) {
           isReply = annoObj.annotates.uri!=annoObj.annotates.rootUri;
               if ((isReply || locators.length == 0 || locators[0].type != "http://www.purl.org/anotar/locator/0.1") && (
                   annoObj.type!="http://www.purl.org/anotar/ns/type/0.1#Tag")) {
                   // Load by URI
                   // Currently hardcoded only for comment
                   node = jQ("*["+config.uriAttr+"='"+annoUri+"']");
               } else {
                   // Load by hash and differentiated by locator type
                   if (locators[0].type == config.hashType) {
                       annoHash = locators[0].value;
                       node = jQ("*["+config.hashAttr+"='"+annoHash+"']");
                   } else {
                       return;
                   }
               }
        } else {
               node = jQ("*["+config.uriAttr+"='"+annoUri+"']");
        }        
        // Get the object as it should be displayed
        var cssToggle = "odd";
        if(node.hasClass("odd"))  cssToggle = "even";
        
        var outputDiv = getAnnontationNode(annoObj, cssToggle);
        if (!config.disableReply)  addCommand(outputDiv, true);
        addId(outputDiv);
        
        if(node.size()!==0){
               attachAnnotation(node, outputDiv, isReply);
               if(annoObj.replies){
                   // if there is replies, load them as well.
                   jQ.each(annoObj.replies,function(c,i){config.loadAnnotation(i);});
               }
               
           }else{ // Orphan handling
            var orphanId = config.stylePrefix + "orphans";
            var orphanTemplate = templates.orphanHolder;
            if (config.orphanHolder != null &&
                config.orphanHolderId != null) {
                orphanId = config.orphanHolderId;
                orphanTemplate = config.orphanHolder;
            }
            // Find our holder
            var holder = docRoot.find("#" + orphanId);
            if (holder.size() == 0) {     // Create the holder
                docRoot.append(renderTemplate(orphanTemplate, {style: config.stylePrefix}))
                holder = docRoot.find("#" + orphanId);
            }
            holder.append(outputDiv);
        }
        return outputDiv;
    }

    // connection
    function getAnnotation(key, callback){
        // get single annotation with this key as id
        var baseQuery = "";
        var searchValue = "";
        var request;
        baseQuery = "_design/anotar/_view/id?key=";
        searchValue = escape('"' + key + '"');
        request = config.serverAddress + baseQuery + searchValue;
        getHttpData2(request, "GET", null, callback);
    }

    function getAnnotations(key, callback) {
        // get all annotation for a document
        var baseQuery = "";
        var searchValue = "";
        var request;
        baseQuery = "_design/anotar/_list/nested/all?key=";
        searchValue = escape('"' + key + '"');
        request = config.serverAddress + baseQuery + searchValue;
        getHttpData2(request, "GET", null, callback);
    }
    
    function postAnnotation(request, payload, callback) {
        getHttpData2(request, "POST", payload, callback);
    }

    function getHttpData2(requestUrl, method, payload, callback) {
        var success = function(data, status) {
            errorMsg = "";
            try{     // to avoid infinite loop, if error in callback.
                callback(data, status);
            }catch(e){
                alert("Error in callback: " + e +", requestURL: " + requestUrl +", method :"+method);
                return;
            }
        }
        var error = function(req, status, e) {
            errorMsg = "ERROR (STATUS: '" + status + "', CODE: '" + req.responseCode + "', BODY: '" + req.responseText + "')";
            alert(errorMsg);
        }
        if(method=="GET") config.getHttpData(requestUrl, success, error);
        else if(method=="POST") config.postHttpData(requestUrl, payload, success, error);
    }
    
    function getHttpData(requestUrl, success, error){
        jQ.ajax({
            type: "GET",
            url: requestUrl,
            success: success,
            error: error,
            dataType: "text"
        });
    }
    
    function postHttpData(requestUrl, payload, success, error){
        jQ.ajax({
            type: "POST",
            url: requestUrl,
            success: success,
            error: error,
            dataType: "text",
            data: payload
        });
    }
    
    // Submission processing
    function postNewAnnotation(data){
        var thisUri = data.annotates.uri;
        var submitCallback = function (data, status) {
            if(!data) return;
            var response = JSON.parse(data);
            if(response.ok == true) {
                // if the response is post success result only,
                // then request the annotation from server again
                var loadCallback = function (data, status) {
                    var anno = JSON.parse(data).rows[0].value;
                    var container = config.loadAnnotation(anno);
                    container = container.closest(getClassSelector("has-annotation"));
                    if(!container.find(getClassSelector("commentList")).is(":visible")){
                        container.find(getClassSelector("showHideComments")).click();// show the comments
                    }
                }
                getAnnotation(response.id, loadCallback);
            } else if(response.annotates){    
                // if server return annotation json back
                var container = config.loadAnnotation(response);
                container = container.closest(getClassSelector("has-annotation"));
                if(!container.find(getClassSelector("commentList")).is(":visible")){
                    container.find(getClassSelector("showHideComments")).click();// show the comments
                }
            } else {
                alert("Sorry! An error occurred saving that data!");
            }
        }
        var payload = JSON.stringify(data);
        
        postAnnotation(config.serverAddress, payload, submitCallback);
    }
    
    // render functions
    function getAnnontationNode(annoObj, cssToggle){
        var node = jQ(renderAnnotation(annoObj, cssToggle));
        if(jQ.timeago) node.find(".timeago").timeago();
        return node;
    }

    function renderAnnotation(annoObj, cssToggle) {
        var creator = "Anonymous";
        var getDisplayTemplate = function(type) {
            switch (type) {
                case "http://www.purl.org/anotar/ns/type/0.1#Tag":
                    return templates.tagDisplay;
                case "http://www.purl.org/anotar/ns/type/0.1#Highlight":
                    return templates.highlightDisplay;
                case "http://www.w3.org/2000/10/annotationType#SeeAlso":
                    // return templates.seeAlsoDisplay;
                case "http://www.w3.org/2000/10/annotationType#Question":
                    // return templates.questionDisplay;
                case "http://www.w3.org/2000/10/annotationType#Explanation":
                    // return templates.explanationDisplay;
                case "http://www.w3.org/2000/10/annotationType#Example":
                    // return templates.exampleDisplay;
                case "http://www.w3.org/2000/10/annotationType#Change":
                    // return templates.changeDisplay;
                case "http://www.w3.org/2000/10/annotationType#Advice":
                    // return templates.adviceDisplay;
                // Comments are also the default
                case "http://www.w3.org/2000/10/annotationType#Comment":
                default: return templates.commentDisplay;
            }
        }

        // Use the literal first. eg. "Bob"
        if (annoObj.creator.literal != null) {
            creator = annoObj.creator.literal;
            // Can we add a URI to make a link?
           
        } 
        // Removed stuff which links to URI or exposes email address PS

        if (annoObj.annotates.locators && annoObj.annotates.locators.length > 0)
            var origContent = annoObj.annotates.locators[0].originalContent;
        
        if (origContent == undefined) origContent = "";
        
        var replyString = "";
        
        function strToHtml(str){
            str = str.replace(/\&/g,"&amp;");
            str = str.replace(/\</g,"&lt;");
            str = str.replace(/\>/g,"&gt;");
            str = str.replace(/\'/g,"&#39;"); //&apos; does not working in IE7
            //don't know why it is being replaced. Hiding for now. 
            //str = str.replace(/\\&apos;/g,"&apos;");  // remove the extra backslash
            str = str.replace(/\"/g,"&quot;");
            str = str.replace(/\n/g,"<br />");
            str = str.replace(/\r/g,"<br />");
            str = unescape(str); // for unicode char
            return str;
        }
        
        var opt = {
            style:     config.stylePrefix,
            toggle:    cssToggle,
            id:        annoObj.uri,
            root:      annoObj.annotates.rootUri,
            original:  strToHtml(origContent),
            creator:   creator,
            date:      annoObj.dateCreated.literal,
            content:   strToHtml(annoObj.content.literal),
            children:  replyString,
            tagCount: annoObj.tagCount,
            locator:   null,
            contentUri: annoObj.contentUri
        };
        
        if (annoObj.annotates.locators && annoObj.annotates.locators.length > 0){
            opt.locator = annoObj.annotates.locators[0].value;
        }
        
        var template = null;
        if (config.displayCustom != null) {
            template = config.displayCustom;
        } else {
            template = getDisplayTemplate(annoObj.type);
        }
        return renderTemplate(template, opt);
    }

    function getW3cDateTimeString() {
        var d = new Date();
        var zPad = function(n) {
            s = n.toString();
            if (s.length == 1)
                s = "0" + s;
            return s;
        }
        var timeZone = function() {
            tz = d.getTimezoneOffset() * 60 / -36;
            tz = tz.toString();
            var negTz = false;
            if (tz[0] == '-')
                negTz = true;
            while (tz.length < 4)
                tz = "0" + tz;
            if(negTz) {
              tz = '-' +tz;
            }  else {
              tz = '+'+tz;
            } 
            tz = tz.substring(0,3) + ":" + tz.substring(3);
            return(tz);
        }
        var response = '' +
            d.getFullYear() + "-" +
            zPad(d.getMonth() + 1) + "-" +
            zPad(d.getDate()) + "T" +
            zPad(d.getHours()) + ":" +
            zPad(d.getMinutes()) + ":" +
            zPad(d.getSeconds()) +
            timeZone()
        return response;
    }

    // =======================================
    // Template Rendering, Adapted from:
    // http://ejohn.org/blog/javascript-micro-templating/
    // =======================================
    function renderTemplate(str, data) {
         // Figure out if we're getting a template, or if we need to
         // load the template - and be sure to cache the result.
         var fn = !/\W/.test(str) ? templateCache[str] = templateCache[str] ||
                 renderTemplate(document.getElementById(str).innerHTML) :

             // Generate a reusable function that will serve as a template
             // generator (and which will be cached).
             new Function("obj",
                 "var p=[];" +
                 // Introduce the data as local variables using with(){}
                 "with(obj) {p.push('" +

                 // Convert the template into pure JavaScript
                 str.replace(/[\r\t\n]/g, " ")
                     .replace(/'/g, "\r")
                     .split("<%").join("\t")
                     .replace(/((^|%>)[^\t]*)'/g, "$1\r")
                     .replace(/\t=(.*?)%>/g, "',$1,'")
                     .split("\t").join("');")
                     .split("%>").join("p.push('")
                     .split("\r").join("\\'")

                 + "');} return p.join('');");
         // Provide some basic currying to the user
         return data ? fn( data ) : fn;
    };

    // AnotarForm
    function anotarFormFactory(config){
        var annotateDiv, commentOnThis, textArea;
        var annotationComments={};
        var last=null;
        var sp = config.stylePrefix;
        var anotarForm = {};
        var uri, hash;
        
        function prepForm() {
            var opt = {style: sp, label: config.label};
            if (config.formCustom == null) {
                annotateDiv = renderTemplate(templates.annotateForm, opt);
            } else {
                annotateDiv = renderTemplate(config.formCustom, opt);
            }
            annotateDiv = jQ(annotateDiv);
            commentOnThis = jQ(renderTemplate(templates.annotateTitle, opt));
            textArea = annotateDiv.find(config.contentInput);
            // setup form button names
            config.formCancel = config.formCancel || "button." + sp + "cancel";
            config.formSubmit = config.formSubmit || "button." + sp + "submit";
            config.formClear  = config.formClear  || "button." + sp + "clear";
            config.formClose  = config.formClose  || "button." + sp + "close";
            // set up form event functions
            config.formCancelFunction = config.formCancelFunction || cancelClick;
            config.formClearFunction = config.formClearFunction || clearClick;
            config.formCloseFunction = config.formCloseFunction || closeClick;
            config.formSubmitFunction = config.formSubmitFunction || submitClick;
        }
        
        function createPayload(data) {
            var schemaObject = {};
            // Version and profile
            schemaObject.clientVersionUri = config.clientUri;
            schemaObject.type = config.annoType;
            schemaObject.title = {
                "literal": data.title,
                "uri": null
            };
            // Annotation target
            schemaObject.annotates = {
                "literal": config.objectLiteral,
                "uri": data.uri,
                "rootUri": data.root
            };
            // Annotation locator(s)
                schemaObject.annotates.locators = [];
            if (data.hash) {
                var thisHash = {
                    "originalContent": data.originalContent,
                    "type": config.hashType,
                    "value": data.hash
                };
                schemaObject.annotates.locators.push(thisHash);
            }
            // Creator
            schemaObject.creator = {
                "literal": config.creator,
                "uri": config.creatorUri,
                "website":config.creatorWebsite,
                "email": {
                    "literal": config.creatorEmail
                }
            };
            // Date handling
            schemaObject.dateCreated = {
                "literal": getW3cDateTimeString(),
                "uri": null
            };
            schemaObject.dateModified = {
                "literal": null,
                "uri": null
            };
            // Content
            schemaObject.content = {
            "mimeType": "text/plain",
            "literal": data.content,
            "formData": {}
        };
            
        // Content Uri
            if (data.contentUri) {
                schemaObject.contentUri = data.contentUri;
            } 
            
            // Privacy
            schemaObject.isPrivate = false;
            if(data.isPrivate) schemaObject.isPrivate = data.isPrivate;
            // Language
            schemaObject.lang = config.lang;
            return schemaObject;
        }        
        // Hides the form
        function unWrapLast() {
            if (last != null) {
                annotateDiv.remove();
                commentOnThis.remove();
                if(last.parent().hasClass(getClassName("inline-annotation-quote"))){
                    last.parent().parent().replaceWith(last);
                }
                last = null;
            }
        }
        // close button callback
        function closeClick() {
            unWrapLast();
            annotationComments[hash] = jQ.trim(textArea.val());
        }
        // cancel callback
        function cancelClick(){
            textArea.val(annotationComments[hash]);
            config.formCloseFunction();
        }
        function clearClick(){
            textArea.val("");
        }
        // Submit callback
        function submitClick(e) {
            var text, html, d, selfUrl,originalContent;
            var linkNode, me,originalContentNode,annoNode,isPrivate, formNode;
            me = jQ(e.target);
            
            // Wipe any saved text we have
            annotationComments[hash] = "";
            // Return if there's nothing to submit
            text = jQ.trim(textArea.val());
            if (text == "") return;
            
            // get the original content
            formNode = me.closest(getClassSelector("inline-annotation-form"));
            originalContentNode = formNode.find(getClassSelector("inline-annotation-quote>*"));
            if(originalContentNode.children(getClassSelector("has-annotation")).size()!==0){// in case there is other comments
                annoNode = originalContentNode.children(getClassSelector("has-annotation"));
                originalContentNode.parent().append(annoNode);
            }
            originalContent = originalContentNode.text();
            if(linkNode) originalContentNode.append(linkNode);
            if(annoNode) originalContentNode.append(annoNode);
            
            isPrivate = false;
            if(config.usePrivacy){
                isPrivate = formNode.find(getClassSelector(config.privacyClassName)+":checked").val() == "true";
            }
            
            // If this is a reply or not
            html = me.wrap("<div/>").parent().html();
            html = jQ(html).text();
            me.parent().replaceWith(me);
            
            hashValue = hash;
            if (!config.pageUri) {
                // HACK - for multiple objects on single page (e.g. search
                // results)
                // use first target hash so it won't get orphaned when
                // loaded on single object page
                hashValue = $(targetList[0]).attr(config.hashAttr);
            } else if (config.hashFunction) {
                hashValue = config.hashFunction(docRoot);
            }
            data = {
                uri: uri,
                root: config.pageUri || uri,
                hash: hashValue,
                originalContent: originalContent,
                content: text,
                isPrivate:isPrivate
            };
            
            if (config.getContentUri) {
                json = config.getContentUri($(config.docRoot));
                if (json.isUri) {
                    data.contentUri = json.contentUri;
                }
            }
            
            // got all the data so hide the form now
            unWrapLast();
            
            data = createPayload(data);
            config.submitAnnotation(data, annotateDiv); // Added second parameter so plugins can process custom forms
        }
        // Retrieve comments if we have them
        var restore = function() {
            if (hash in annotationComments) {
                textArea.val(annotationComments[hash]);
            } else {
                textArea.val("");
            }
        }
    
        function annotate(me) {
            var opt = {style: sp};
            // Click logic starts.
            // Hide any other annotation forms that were visible
            if (last != null) {
                unWrapLast();
                config.formCancelFunction();
            }
            // What are we annotating?
            hash = me.attr(config.hashAttr);
            if(config.uriAttr) {
                uri = me.attr(config.uriAttr);
                if (config.pageUri) {
                    if(uri){
                        pageUriPos = uri.search(config.pageUri);
                        if (pageUriPos == -1) pageUriPos = 0;
                        if(uri.substring(pageUriPos, config.pageUri.length + pageUriPos)===config.pageUri){
                            hash = null;
                        } else {
                            uri = config.pageUri;
                        }
                    } else {
                        uri = config.pageUri;
                    }
                }
            } 

            // Do we have any text saved?
            restore();
            function defaultDisplayForm(){
                me.wrap(renderTemplate(templates.annotateWrap, opt));
                if (config.formPrepend) {
                    me.parent().prepend(annotateDiv);
                } else {
                   me.parent().append(annotateDiv);
                }
                me.parent().prepend(commentOnThis);
                me.wrap(renderTemplate(templates.annotateQuote, opt));
            }
            // Render our form
            if(config.formPopup){
                if(!config.formPopupSettings)
                    config.formPopupSettings = {
                            closeText:"x",
                            resizable:false,
                            title:"Anotar"
                    };
                try{
                    annotateDiv.dialog(config.formPopupSettings);
                }catch(e){
                    // if can't find the dialog then use the default form
                    defaultDisplayForm();
                }
            }else{
                defaultDisplayForm();
            }

        // call custom form display function
            if (config.onFormDisplay) {
                config.onFormDisplay(textArea);
            }

            // setup the event click function
            annotateDiv.find(config.formClear).click(config.formClearFunction);
            annotateDiv.find(config.formCancel).click(config.formCancelFunction);
            annotateDiv.find(config.formClose).click(config.formCloseFunction);
            annotateDiv.find(config.formSubmit).click(config.formSubmitFunction);
            last = me;
            textArea.focus();
        }
        
        prepForm();
        anotarForm.annotate = annotate;
        return anotarForm;
    }
    // end of AnotarForm
    return anotar;
}


// =======================================
// Crc32
// =======================================
function Crc32(str) {
    function Crc32Hex(str) {
        return Hex32(Crc32Str(str));
    }

    function Crc32Str(str) {
        var len = str.length;
        var crc = 0xFFFFFFFF;
        for (var n = 0; n < len; n++) {
            crc = Crc32Add(crc, str.charCodeAt(n));
        }
        return crc^0xFFFFFFFF;
    }

    function Hex32(val) {
        var n;
        var str1;
        var str2;
        n = val&0xFFFF;
        str1 = n.toString(16).toUpperCase();
        while (str1.length < 4) {
            str1 = "0" + str1;
        }
        n = (val>>>16)&0xFFFF;
        str2 = n.toString(16).toUpperCase();
        while (str2.length < 4) {
            str2 = "0" + str2;
        }
        return str2 + str1;
    }

    var Crc32Tab = [
        0x00000000,0x77073096,0xEE0E612C,0x990951BA,0x076DC419,0x706AF48F,0xE963A535,0x9E6495A3,
        0x0EDB8832,0x79DCB8A4,0xE0D5E91E,0x97D2D988,0x09B64C2B,0x7EB17CBD,0xE7B82D07,0x90BF1D91,
        0x1DB71064,0x6AB020F2,0xF3B97148,0x84BE41DE,0x1ADAD47D,0x6DDDE4EB,0xF4D4B551,0x83D385C7,
        0x136C9856,0x646BA8C0,0xFD62F97A,0x8A65C9EC,0x14015C4F,0x63066CD9,0xFA0F3D63,0x8D080DF5,
        0x3B6E20C8,0x4C69105E,0xD56041E4,0xA2677172,0x3C03E4D1,0x4B04D447,0xD20D85FD,0xA50AB56B,
        0x35B5A8FA,0x42B2986C,0xDBBBC9D6,0xACBCF940,0x32D86CE3,0x45DF5C75,0xDCD60DCF,0xABD13D59,
        0x26D930AC,0x51DE003A,0xC8D75180,0xBFD06116,0x21B4F4B5,0x56B3C423,0xCFBA9599,0xB8BDA50F,
        0x2802B89E,0x5F058808,0xC60CD9B2,0xB10BE924,0x2F6F7C87,0x58684C11,0xC1611DAB,0xB6662D3D,
        0x76DC4190,0x01DB7106,0x98D220BC,0xEFD5102A,0x71B18589,0x06B6B51F,0x9FBFE4A5,0xE8B8D433,
        0x7807C9A2,0x0F00F934,0x9609A88E,0xE10E9818,0x7F6A0DBB,0x086D3D2D,0x91646C97,0xE6635C01,
        0x6B6B51F4,0x1C6C6162,0x856530D8,0xF262004E,0x6C0695ED,0x1B01A57B,0x8208F4C1,0xF50FC457,
        0x65B0D9C6,0x12B7E950,0x8BBEB8EA,0xFCB9887C,0x62DD1DDF,0x15DA2D49,0x8CD37CF3,0xFBD44C65,
        0x4DB26158,0x3AB551CE,0xA3BC0074,0xD4BB30E2,0x4ADFA541,0x3DD895D7,0xA4D1C46D,0xD3D6F4FB,
        0x4369E96A,0x346ED9FC,0xAD678846,0xDA60B8D0,0x44042D73,0x33031DE5,0xAA0A4C5F,0xDD0D7CC9,
        0x5005713C,0x270241AA,0xBE0B1010,0xC90C2086,0x5768B525,0x206F85B3,0xB966D409,0xCE61E49F,
        0x5EDEF90E,0x29D9C998,0xB0D09822,0xC7D7A8B4,0x59B33D17,0x2EB40D81,0xB7BD5C3B,0xC0BA6CAD,
        0xEDB88320,0x9ABFB3B6,0x03B6E20C,0x74B1D29A,0xEAD54739,0x9DD277AF,0x04DB2615,0x73DC1683,
        0xE3630B12,0x94643B84,0x0D6D6A3E,0x7A6A5AA8,0xE40ECF0B,0x9309FF9D,0x0A00AE27,0x7D079EB1,
        0xF00F9344,0x8708A3D2,0x1E01F268,0x6906C2FE,0xF762575D,0x806567CB,0x196C3671,0x6E6B06E7,
        0xFED41B76,0x89D32BE0,0x10DA7A5A,0x67DD4ACC,0xF9B9DF6F,0x8EBEEFF9,0x17B7BE43,0x60B08ED5,
        0xD6D6A3E8,0xA1D1937E,0x38D8C2C4,0x4FDFF252,0xD1BB67F1,0xA6BC5767,0x3FB506DD,0x48B2364B,
        0xD80D2BDA,0xAF0A1B4C,0x36034AF6,0x41047A60,0xDF60EFC3,0xA867DF55,0x316E8EEF,0x4669BE79,
        0xCB61B38C,0xBC66831A,0x256FD2A0,0x5268E236,0xCC0C7795,0xBB0B4703,0x220216B9,0x5505262F,
        0xC5BA3BBE,0xB2BD0B28,0x2BB45A92,0x5CB36A04,0xC2D7FFA7,0xB5D0CF31,0x2CD99E8B,0x5BDEAE1D,
        0x9B64C2B0,0xEC63F226,0x756AA39C,0x026D930A,0x9C0906A9,0xEB0E363F,0x72076785,0x05005713,
        0x95BF4A82,0xE2B87A14,0x7BB12BAE,0x0CB61B38,0x92D28E9B,0xE5D5BE0D,0x7CDCEFB7,0x0BDBDF21,
        0x86D3D2D4,0xF1D4E242,0x68DDB3F8,0x1FDA836E,0x81BE16CD,0xF6B9265B,0x6FB077E1,0x18B74777,
        0x88085AE6,0xFF0F6A70,0x66063BCA,0x11010B5C,0x8F659EFF,0xF862AE69,0x616BFFD3,0x166CCF45,
        0xA00AE278,0xD70DD2EE,0x4E048354,0x3903B3C2,0xA7672661,0xD06016F7,0x4969474D,0x3E6E77DB,
        0xAED16A4A,0xD9D65ADC,0x40DF0B66,0x37D83BF0,0xA9BCAE53,0xDEBB9EC5,0x47B2CF7F,0x30B5FFE9,
        0xBDBDF21C,0xCABAC28A,0x53B39330,0x24B4A3A6,0xBAD03605,0xCDD70693,0x54DE5729,0x23D967BF,
        0xB3667A2E,0xC4614AB8,0x5D681B02,0x2A6F2B94,0xB40BBE37,0xC30C8EA1,0x5A05DF1B,0x2D02EF8D];

    function Crc32Add(crc, c) {
        return Crc32Tab[(crc^c)&0xFF]^((crc>>8)&0xFFFFFF);
    }

    return Crc32Hex(str);
}

// Basic String util
