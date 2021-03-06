###
@author Ximdex <dev@ximdex.com>
###

window.ceditor = null 
selectedTextAnnotation = null 
currentSelectedSuggestion = null 
suggestions_field = jQuery '#suggestions_field' 

(($) ->
    CKEDITOR.config.allowedContent = true
    CKEDITOR.plugins.add 'xowl_enhance_plugin', 
        init: (editor) ->
            window.parent.ceditor = editor 
            if not Drupal.settings.xowl?
                return
            if not Drupal.settings.xowl.enable_xowl? or Drupal.settings.xowl.enable_xowl != 1 
                return 
                
            if not CKEDITOR.xowl?
                CKEDITOR.xowl = 
                    entities: {}
                    suggestions: {}
                    
            editor.ui.addButton 'xowl_enhance_plugin_button', 
                label: 'Xowl Enhance'
                icon: this.path + 'icons/xowl_enhance_plugin_button.png'
                command: 'xowl_content_enhance_command'
                
            editor.addCommand 'xowl_content_enhance_command',
                exec: () ->
                    content = editor.getData()
                    $loader = $ "<div/>",
                        class: 'loader'
                    $("<img/>")
                        .attr('src', "#{Drupal.settings.xowl.basedir}/ckeditor/plugins/xowl_enhance_plugin/icons/loader.gif")
                        .appendTo $loader
                    $('body')
                        .css("position", "relative")
                        .append $loader

                    $.ajax
                        type: 'POST'
                        dataType: "json"
                        url: Drupal.settings.basePath + '?q=xowl/enhance'
                        data: {content: content}
                    .done (data) ->
                        $loader.remove()
                        if (data && data.text? && data.text.length > 0)
                            CKEDITOR.xowl['lastResponse'] = data
                            editor.setData '', () ->
                                this.insertHtml replaceXowlAnnotations data 
                                fillSuggestionsField()
                                return
                        else
                            alert data.status + ": " + data.message
                        return
                    .fail () ->
                        $loader.remove()
                        alert "Error retrieving content from XOwl" 
                        return
                    return

            CKEDITOR.dialog.add 'xowl_dialog', ()->
                dialogDefinition = 
                    title: 'Select Entity Dialog'
                    minWidth: 390
                    minHeight: 130
                    contents: [
                        id: 'tab_entities'
                        label: 'Select Entity'
                        title: 'Select Entity'
                        expand: true
                        padding: 0
                        elements: [
                            type: 'select'
                            id: 'xowl_entities'
                            label: 'Select Entities'
                            items: []
                            onChange: (e) ->
                                CKEDITOR.xowl.suggestions[selectedTextAnnotation] = this.getValue()
                                return
                        ]
                    ]
                    buttons: [
                        CKEDITOR.dialog.okButton,
                        CKEDITOR.dialog.cancelButton,
                            type: 'button'
                            id: 'removeSuggestion'
                            label: 'Remove'
                            title: 'Remove'
                            onClick: ()->
                                removeSuggestion editor
                                this.getDialog().hide()
                                return
                    ]
                    onOk: () ->
                        selectedEntityUri = CKEDITOR.xowl.suggestions[selectedTextAnnotation]
                        selectedEntityType = CKEDITOR.xowl.tempTypes[selectedEntityUri]
                        $(this.getParentEditor().window.getFrame().$)
                            .contents()
                            .find('[data-cke-annotation="' + selectedTextAnnotation + '"]')
                            .attr({"href": CKEDITOR.xowl.suggestions[selectedTextAnnotation], "data-cke-saved-href": CKEDITOR.xowl.suggestions[selectedTextAnnotation], "data-cke-type": selectedEntityType})
                        $(this.getParentEditor().window.getFrame().$).contents()
                            .find('[data-cke-annotation="' + selectedTextAnnotation + '"]')
                            .removeAttr("data-cke-suggestions")
                        fillSuggestionsField()
                        return
                    onCancel: () ->
                        CKEDITOR.xowl.suggestions[selectedTextAnnotation] = currentSelectedSuggestion
                        return
                    onShow: () ->
                        dialogTabSelect = this.getContentElement 'tab_entities', 'xowl_entities'  
                        entities = CKEDITOR.xowl.entities[selectedTextAnnotation]
                        CKEDITOR.xowl.tempTypes = {}
                        dialogTabSelect.clear()
                        
                        if entities?
                            for entity in entities
                                dialogTabSelect.add "#{selectedTextAnnotation} (#{entity.uri})", entity.uri 
                                CKEDITOR.xowl.tempTypes[entity.uri] = entity.type
                        dialogTabSelect.setValue CKEDITOR.xowl.suggestions[selectedTextAnnotation] 
                        currentSelectedSuggestion = CKEDITOR.xowl.suggestions[selectedTextAnnotation] 
                        return
                    
            editor.on 'contentDom', (e) ->
                $(editor.document.$)
                .unbind('keyup') 
                .bind 'keyup', (evt) ->
                    if evt.keyCode == 8 || evt.keyCode == 46 
                        evt.stopPropagation() 
                        $(editor.document.$) 
                            .find("[data-cke-annotation]")
                            .each (i,element) ->
                                $el = $(element)
                                if $el.html() != $el.attr("data-cke-annotation") 
                                    delete CKEDITOR.xowl.suggestions[$el.attr("data-cke-annotation")] 
                                    $el.replaceWith $el.html() 
                                return 
                        fillSuggestionsField()
                        return
                        
                $(editor.document.$)
                    .find('.xowl-suggestion').unbind('click').click () ->
                        selectedTextAnnotation = $(this).data('cke-annotation')
                        openXowlDialog(e.editor)
                        return
                return

            editor.on 'change',  (e) ->
                $(e.editor.window.getFrame().$) 
                .contents()
                .find('.xowl-suggestion') 
                .unbind('click')
                .bind 'click' , () ->
                    selectedTextAnnotation = $(this).data 'cke-annotation'
                    openXowlDialog e.editor
                    return
                return
            return

#    <p>Function to replace text annotation mentions by the entity annotation URI</p>
#    @param result object result Containing the text, Text Annotations (with positions) and Entity Annotations
#    @returns The text with the found mentions replaced
    replaceXowlAnnotations = (result) ->
        re = /<a[^<]*<\/a>/g
        reHref = /href="([^"]*)"/
        src = result.text
        while ((arr = re.exec(src)) != null)
            oldLink = arr[0]
            reHref.exec oldLink
            oldHref = RegExp.$1
            newHref = oldHref.replace 'dbpedia.org/resource', 'en.wikipedia.org/wiki'
            newLink = oldLink.replace oldHref, newHref
            src = src.replace(oldLink, newLink)
        processSemantic result.semantic
        src
    
    processSemantic = (aSemantic) ->
        for oSemanticSet in aSemantic
            # delete duplicated entities
            filteredEntities = []
            f = -1
            sortedEntities = oSemanticSet.entities.sort (a,b) ->
                a.uri.localeCompare b.uri
            for ann in sortedEntities
                if f == -1 || sortedEntities[f] != ann
                    filteredEntities.push ann
                    f++
            # use filteredAnnotations
            for ent in filteredEntities
                ent.uri = ent.uri.replace 'dbpedia.org/resource', 'en.wikipedia.org/wiki'
            mention = oSemanticSet['selected-text']
            entity = oSemanticSet.entities[0]
            numSuggestions = oSemanticSet.entities.length
            CKEDITOR.xowl.suggestions[mention.value] = entity.uri
            CKEDITOR.xowl.entities[mention.value] = oSemanticSet.entities
        return
        
    removeSuggestion = (editor)->
        $(editor.window.getFrame().$)
            .contents()
            .find("[data-cke-annotation=\"#{selectedTextAnnotation}\"]") 
            .replaceWith selectedTextAnnotation 
        delete CKEDITOR.xowl.suggestions[selectedTextAnnotation] 
        return
        
    openXowlDialog = (editor) ->
        if !CKEDITOR.xowl || !CKEDITOR.xowl.entities
            return
        editor.openDialog 'xowl_dialog' 
        return
        
    fillSuggestionsField = () ->
        suggestions_field.val JSON.stringify CKEDITOR.xowl.suggestions 
        return
    
    return
) jQuery

