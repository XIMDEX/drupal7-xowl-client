/**
 *
 * @author Ximdex <dev@ximdex.com>
 */
window.ceditor = null;
selectedTextAnnotation = null;
currentSelectedSuggestion = null;
suggestions_field = jQuery("#suggestions_field");
(function($) {
    CKEDITOR.config.allowedContent = true;
    CKEDITOR.plugins.add('xowl_enhance_plugin', {
        init: function(editor) {
            window.parent.ceditor = editor;
            if (Drupal.settings.xowl === undefined)
                return;
            if (Drupal.settings.xowl.enable_xowl === undefined || Drupal.settings.xowl.enable_xowl !== 1) {
              return;
            }

            /* Initializing Xowl object */
            if (CKEDITOR.xowl === undefined) {
                    CKEDITOR.xowl = {};
                    CKEDITOR.xowl.entities = {};
                    CKEDITOR.xowl.suggestions = {};
            }

            editor.config.enterMode = CKEDITOR.ENTER_P;
            editor.ui.addButton('xowl_enhance_plugin_button', {
                label: 'Xowl Enhance', //this is the tooltip text for the button
                icon: this.path + 'icons/xowl_enhance_plugin_button.png',
                command: 'xowl_content_enhance_command'
            });
            editor.addCommand('xowl_content_enhance_command', {
                exec: function() {
                    var content = editor.getData();
                    content = prepareContent(content);
                    //here we tell CKEditor what to do.
                    var $loader = $("<div/>", {class: 'loader'});
                    $("<img/>").attr('src', Drupal.settings.xowl.basedir+'/ckeditor/plugins/xowl_enhance_plugin/icons/loader.gif').appendTo($loader);
                    $("body").css("position", "relative").append($loader);
                    $.ajax({
                        type: 'POST',
                        dataType: "json",
                        url: Drupal.settings.basePath + 'xowl/enhance',
                        async: false,
                        data: {
                            content: content
                        }

                    }).done(function(data) {
                        $loader.remove();
                        if (data) {
                            var result = data;

                        CKEDITOR.xowl['lastResponse'] = result;

                            editor.setData('', function(arg) {
                                this.insertHtml(replaceXowlAnnotations(result));
                                fillSuggestionsField();

                            });

                        }
                    }).fail(function(jqXHR, textStatus, errorThrown) {
                        $loader.remove();
                        alert("Error retrieving content from XOwl");
                    });
                }
            });


            /* Select Entity Dialog */
            /* Registering Dialog in CKEditor */
            CKEDITOR.dialog.add('xowl_dialog', function(api) {
                // CKEDITOR.dialog.definition
                var dialogDefinition = {
                    title: 'Select Entity Dialog',
                    minWidth: 390,
                    minHeight: 130,
                    contents: [
                        {
                            id: 'tab_entities',
                            label: 'Select Entity',
                            title: 'Select Entity',
                            expand: true,
                            padding: 0,
                            elements: [
                                {
                                    type: 'select',
                                    id: 'xowl_entities',
                                    label: 'Select Entities',
                                    items: [],
                                    onChange: function(e) {
                                        CKEDITOR.xowl.suggestions[selectedTextAnnotation] = this.getValue();
                                    }
                                }
                            ]
                        }
                    ],
                    buttons: [CKEDITOR.dialog.okButton, CKEDITOR.dialog.cancelButton, {
                                                                                        type: 'button',
                                                                                        id: 'removeSuggestion',
                                                                                        label: 'Eliminar ',
                                                                                        title: 'Eliminar',
                                                                                        onClick: function() {
                                                                                            // Remove the suggestion for the selected text annotation
                                                                                            removeSuggestion(editor);
                                                                                            this.getDialog().hide();
                                                                                        }
                                                                                      }
                             ], //Default buttons
                    onOk: function() {
                        var selectedEntityUri = CKEDITOR.xowl.suggestions[selectedTextAnnotation];
                        var selectedEntityType = CKEDITOR.xowl.tempTypes[selectedEntityUri];
                        $(this.getParentEditor().window.getFrame().$).contents().find('[data-cke-annotation="' + selectedTextAnnotation + '"]').attr({"href": CKEDITOR.xowl.suggestions[selectedTextAnnotation], "data-cke-saved-href" : CKEDITOR.xowl.suggestions[selectedTextAnnotation], "data-cke-type": selectedEntityType});
                        $(this.getParentEditor().window.getFrame().$).contents().find('[data-cke-annotation="' + selectedTextAnnotation + '"]').removeAttr("data-cke-suggestions");
                        fillSuggestionsField();
                    },
                    onCancel: function() {
                        //Cancel button pressed. Putting the previous selected suggestion for the selected text annotation
                        CKEDITOR.xowl.suggestions[selectedTextAnnotation] = currentSelectedSuggestion;
                    },
                    onShow: function() {
                        var dialogTabSelect = this.getContentElement('tab_entities', 'xowl_entities'); // getting the entity selection dialog
                        entities = CKEDITOR.xowl.entities[selectedTextAnnotation];
                        // Variable to store temporarily the entity uri and type. Useful to modify the type of the mention link
                        CKEDITOR.xowl.tempTypes = {};
                        dialogTabSelect.clear();
                        entities.forEach(function(entity) {
                            dialogTabSelect.add(entity.label + " (" + entity.uri + ")", entity.uri);
                            CKEDITOR.xowl.tempTypes[entity.uri] = entity.type;
                        });
                        dialogTabSelect.setValue(CKEDITOR.xowl.suggestions[selectedTextAnnotation]);
                        currentSelectedSuggestion = CKEDITOR.xowl.suggestions[selectedTextAnnotation];
                    }
                };

                return dialogDefinition;
            });

            /* Add listeners to the editor when a mention is clicked */
            editor.on('contentDom', function(e) {
               $(editor.document.$).unbind('keyup').bind('keyup', function( evt ) {
                if(evt.keyCode == 8 || evt.keyCode == 46) {
                    evt.stopPropagation();
                    $(editor.document.$).find("[data-cke-annotation]").each(function(i,element) {
                       var $el = $(element);
                       // Removing part of an annotation. Removing the annotation
                       if ($el.html() != $el.attr("data-cke-annotation")) {
                           delete CKEDITOR.xowl.suggestions[$el.attr("data-cke-annotation")];
                           $el.replaceWith($el.html());
                       }
                    });

                    fillSuggestionsField();

                }
               });

                $(editor.document.$).find('.xowl-suggestion').unbind('click').click(function() {
                    // setting up the click function
                    selectedTextAnnotation = $(this).data('cke-annotation');
                    openXowlDialog(e.editor);
                });
            });

            editor.on('change', function(e) {
                $(e.editor.window.getFrame().$).contents().find('.xowl-suggestion').unbind('click').click(function() {
                    // setting up the change function
                    selectedTextAnnotation = $(this).data('cke-annotation');
                    openXowlDialog(e.editor);
                });
            });
        }
    });

    /**
     * <p>Cleans the content, removing the links put by the plugin</p>
     * <p>Adds some marks to let Xowl enhance html content successfully</p>
     * @param content String The content to be prepared
     * @returns String The prepared content
     */
    function prepareContent(content) {
        var cleanRegExp = new RegExp("<a[^<>]*?xowl\-suggestion[^<>]*?>([^<>]*?)</a>", "g");
        content = content.replace(cleanRegExp, "$1");
        var tagRegExp = new RegExp("(<(?:b|u|strong|em|i)[^<>]*?>)([^<>]*?)(<\/(?:b|u|strong|em|i)>)", "g");
        content = content.replace(tagRegExp, "$1 $2 $3");
        return content;
    }

    /**
     * <p>Function to replace text annotation mentions by the entity annotation URI</p>
     * @param result object result Containing the text, Text Annotations (with positions) and Entity Annotations
     * @returns The text with the found mentions replaced
     */
    function replaceXowlAnnotations(result) {
        var text = result.text;

        CKEDITOR.xowl.suggestions = {};
        CKEDITOR.xowl.entities = {};
        if (result.semantic)
            text = processSemanticAnnotations(text, result.semantic);

        return text;
    }

    /**
     * <p>Process the annotations in the text</p>
     * @param text String The text
     * @param annotations Object The annotations to be processed
     */
    function processSemanticAnnotations(text, annotations) {

        var newText = '';
        var textLength = text.length;
        var last = 0; // last mention offset
        var lastExpReg = 0; // last expresion regular applied offset

        // Replacing text annotations by links
        annotations.forEach(function(textAnnotation, index) {
           // If no entities for this text annotation, skip it
           if(textAnnotation.entities === null || textAnnotation.entities === undefined || textAnnotation.entities.length === 0) {
               return;
           }

           var mention = textAnnotation['selected-text'];
           var entity = textAnnotation.entities[0];
           var numSuggestions = textAnnotation.entities.length;
           var start = textAnnotation['start'];
           var end = textAnnotation['end'];

           // Avoiding overlap of mentions, skipping mentions overlapped by mentions processed previously
           if(start < last || start < lastExpReg ) {
               return;
           }

           // Skipping mentions representing HTML tags like <mention> </mention> or encoded &lt;mention&gt; or &lt;/mention&gt;
           var prevChar = text.substring(start-1,start);
           var prevPrevChar = text.substring(start-2,start-1);
           var postChar = text.substring(end,end+1);

           if(((prevChar === "<" || (prevChar === "/" && prevPrevChar === "<")) && postChar === ">") || ((prevChar === ";" || (prevChar === "/" && prevPrevChar === ";")) && postChar === "&") ){
           // Skipping mention processing because it represents a html tag
                return;
           }

           //Changing mention by link only for the ones don't already contained in a link
           var regExpContent = new RegExp("(<(?:a)[^<>]*?>[^<>]*?(?:"+mention+")[^<>]*?<\/(?:a)>)", "i");
           var regExpAttr = new RegExp("(<(?:a|img)?[^<>]*?(?:"+mention+")[^<>]*?/?>[^<>]*?(<\/(?:a)>)?)", "i");

           var partialText = text.substr(lastExpReg);

           var contentRes = regExpContent.exec(partialText);
           var attrRes = regExpAttr.exec(partialText);
           var addFlag = true;

           // Auxiliar variables. OffsetIndex is the number of characteres already processed
           var contentResTmp = 0, attrResTmp = 0, offsetIndex = text.substring(0,lastExpReg).length;

           // Checking whether the mention is inside a link/image and the mention offset is inside the link/image offset (both attributes and content)
           // Since we apply the regular expression over the remaining content, we have to use the offsetIndex to have an appropriate index comparation
           if(contentRes !== null) {
               if(start >= offsetIndex + contentRes.index && start <= (offsetIndex + contentRes.index + contentRes[0].length)) {
                   addFlag = false;
                   contentResTmp = offsetIndex + contentRes.index + contentRes[0].length;
               }
           }

           if(attrRes !== null) {
               if(start >= offsetIndex+ attrRes.index && start <= (offsetIndex+ attrRes.index + attrRes[0].length)) {
                   addFlag = false;
                   attrResTmp = offsetIndex + attrRes.index + attrRes[0].length;
               }
           }

           // Storing the maximum of the applied regular expressions
           if(attrResTmp !== 0 || contentResTmp !== 0) {
                lastExpReg = Math.max(contentResTmp, attrResTmp);
           }

           // Adding a semantic link if addFlag is set
           if(addFlag) {
            var taLink = '<a href="' + entity.uri + '" class="xowl-suggestion" data-cke-annotation="' + mention + '" data-cke-type="' + entity.type + '" data-cke-suggestions="' + numSuggestions + '">' + mention.trim() + '</a>';
            newText += text.substring(last, start);
            newText += taLink;
            last = end;

            // Storing the selected entity for each mention and the entities per mention
           CKEDITOR.xowl.suggestions[mention] = entity.uri;
           CKEDITOR.xowl.entities[mention] = textAnnotation.entities;
           }

        });

        // Put the remaining piece of text
        if(last < textLength) {
            newText += text.substring(last);
        }

        return newText;

    }

    /**
     * <p>Removes the suggestion for the selected text annotation</p>
     * @param editor CKEDITOR.editor The CKEDITOR.editor instance
     */
    function removeSuggestion(editor) {
        $(editor.window.getFrame().$).contents().find('[data-cke-annotation="' + selectedTextAnnotation + '"]').replaceWith(selectedTextAnnotation);
        delete CKEDITOR.xowl.suggestions[selectedTextAnnotation];
    }

    /**
     * <p>Fills the suggestions field (hidden) with a JSON representation of the selected suggestions</p>
     */
    function fillSuggestionsField() {
        suggestions_field.val(JSON.stringify(CKEDITOR.xowl.suggestions));
    }

    /**
     * <p>Opens the Xowl dialog to select suggestions</p>
     * @param editor CKEDITOR.editor The editor used to open the dialog
     */
    function openXowlDialog(editor) {
        if (!CKEDITOR.xowl || !CKEDITOR.xowl.entities)
            return;
        editor.openDialog('xowl_dialog');
    }

})(jQuery);
