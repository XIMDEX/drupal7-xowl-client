/*
 @author Ximdex <dev@ximdex.com>
 */

var currentSelectedSuggestion, selectedTextAnnotation, suggestions_field;

window.ceditor = null;

selectedTextAnnotation = null;

currentSelectedSuggestion = null;

suggestions_field = jQuery('#suggestions_field');

(function ($) {
    var fillSuggestionsField, openXowlDialog, processSemantic, removeSuggestion, replaceXowlAnnotations;
    CKEDITOR.config.allowedContent = true;
    CKEDITOR.plugins.add('xowl_enhance_plugin', {
        init: function (editor) {
            window.parent.ceditor = editor;
            if (Drupal.settings.xowl == null) {
                return;
            }
            if ((Drupal.settings.xowl.enable_xowl == null) || Drupal.settings.xowl.enable_xowl !== 1) {
                return;
            }
            if (CKEDITOR.xowl == null) {
                CKEDITOR.xowl = {
                    entities: {},
                    suggestions: {}
                };
            }
            editor.ui.addButton('xowl_enhance_plugin_button', {
                label: 'Xowl Enhance',
                icon: this.path + 'icons/xowl_enhance_plugin_button.png',
                command: 'xowl_content_enhance_command'
            });
            editor.addCommand('xowl_content_enhance_command', {
                exec: function () {
                    var $loader, content;
                    content = editor.getData();
                    $loader = $("<div/>", {
                        "class": 'loader'
                    });
                    $("<img/>").attr('src', "" + Drupal.settings.xowl.basedir + "/ckeditor/plugins/xowl_enhance_plugin/icons/loader.gif").appendTo($loader);
                    $('body').css("position", "relative").append($loader);
                    $.ajax({
                        type: 'POST',
                        dataType: "json",
                        url: Drupal.settings.basePath + '?q=xowl/enhance',
                        data: {
                            content: content
                        }
                    }).done(function (data) {
                        $loader.remove();
                        if (data && (data.text != null) && data.text.length > 0) {
                            CKEDITOR.xowl['lastResponse'] = data;
                            editor.setData('', function () {
                                this.insertHtml(replaceXowlAnnotations(data));
                                fillSuggestionsField();
                            });
                        } else {
                            alert(data.status + ": " + data.message);
                        }
                    }).fail(function () {
                        $loader.remove();
                        alert("Error retrieving content from XOwl");
                    });
                }
            });
            CKEDITOR.dialog.add('xowl_dialog', function () {
                var dialogDefinition;
                return dialogDefinition = {
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
                                    onChange: function (e) {
                                        CKEDITOR.xowl.suggestions[selectedTextAnnotation] = this.getValue();
                                    }
                                }
                            ]
                        }
                    ],
                    buttons: [
                        CKEDITOR.dialog.okButton, CKEDITOR.dialog.cancelButton, {
                            type: 'button',
                            id: 'removeSuggestion',
                            label: 'Remove',
                            title: 'Remove',
                            onClick: function () {
                                removeSuggestion(editor);
                                this.getDialog().hide();
                            }
                        }
                    ],
                    onOk: function () {
                        var selectedEntityType, selectedEntityUri;
                        selectedEntityUri = CKEDITOR.xowl.suggestions[selectedTextAnnotation];
                        selectedEntityType = CKEDITOR.xowl.tempTypes[selectedEntityUri];
                        $(this.getParentEditor().window.getFrame().$).contents().find('[data-cke-annotation="' + selectedTextAnnotation + '"]').attr({
                            "href": CKEDITOR.xowl.suggestions[selectedTextAnnotation],
                            "data-cke-saved-href": CKEDITOR.xowl.suggestions[selectedTextAnnotation],
                            "data-cke-type": selectedEntityType
                        });
                        $(this.getParentEditor().window.getFrame().$).contents().find('[data-cke-annotation="' + selectedTextAnnotation + '"]').removeAttr("data-cke-suggestions");
                        fillSuggestionsField();
                    },
                    onCancel: function () {
                        CKEDITOR.xowl.suggestions[selectedTextAnnotation] = currentSelectedSuggestion;
                    },
                    onShow: function () {
                        var dialogTabSelect, entities, entity, _i, _len;
                        dialogTabSelect = this.getContentElement('tab_entities', 'xowl_entities');
                        entities = CKEDITOR.xowl.entities[selectedTextAnnotation];
                        CKEDITOR.xowl.tempTypes = {};
                        dialogTabSelect.clear();
                        if (entities != null) {
                            for (_i = 0, _len = entities.length; _i < _len; _i++) {
                                entity = entities[_i];
                                dialogTabSelect.add("" + selectedTextAnnotation + " (" + entity.uri + ")", entity.uri);
                                CKEDITOR.xowl.tempTypes[entity.uri] = entity.type;
                            }
                        }
                        dialogTabSelect.setValue(CKEDITOR.xowl.suggestions[selectedTextAnnotation]);
                        currentSelectedSuggestion = CKEDITOR.xowl.suggestions[selectedTextAnnotation];
                    }
                };
            });
            editor.on('contentDom', function (e) {
                $(editor.document.$).unbind('keyup').bind('keyup', function (evt) {
                    if (evt.keyCode === 8 || evt.keyCode === 46) {
                        evt.stopPropagation();
                        $(editor.document.$).find("[data-cke-annotation]").each(function (i, element) {
                            var $el;
                            $el = $(element);
                            if ($el.html() !== $el.attr("data-cke-annotation")) {
                                delete CKEDITOR.xowl.suggestions[$el.attr("data-cke-annotation")];
                                $el.replaceWith($el.html());
                            }
                        });
                        fillSuggestionsField();
                    }
                });
                $(editor.document.$).find('.xowl-suggestion').unbind('click').click(function () {
                    selectedTextAnnotation = $(this).data('cke-annotation');
                    openXowlDialog(e.editor);
                });
            });
            editor.on('change', function (e) {
                $(e.editor.window.getFrame().$).contents().find('.xowl-suggestion').unbind('click').bind('click', function () {
                    selectedTextAnnotation = $(this).data('cke-annotation');
                    openXowlDialog(e.editor);
                });
            });
        }
    });

    changeUrl = function (url) {
        var patt = /(..\.)?(dbpedia.org\/resource\/)/;
        var match = patt.exec(url);
        if (match) {
            var lang = (typeof match[1] === 'undefined') ? 'en.' : match[1];
            url = url.replace(match[0], lang + 'wikipedia.org/wiki/');
        }
        return url;
    };

    replaceXowlAnnotations = function (result) {
        var arr, newHref, newLink, oldHref, oldLink, re, reHref, src;
        re = /<a[^<]*<\/a>/g;
        reHref = /href="([^"]*)"/;
        src = result.text;
        while ((arr = re.exec(src)) !== null) {
            oldLink = arr[0];
            reHref.exec(oldLink);
            oldHref = RegExp.$1;
            newHref = changeUrl(oldHref);
            newLink = oldLink.replace(oldHref, newHref);
            src = src.replace(oldLink, newLink);
        }
        processSemantic(result.semantic);
        return src;
    };
    processSemantic = function (aSemantic) {
        var ann, ent, entity, f, filteredEntities, mention, numSuggestions, oSemanticSet, sortedEntities, _i, _j, _k, _len, _len1, _len2;
        for (_i = 0, _len = aSemantic.length; _i < _len; _i++) {
            oSemanticSet = aSemantic[_i];
            filteredEntities = [];
            f = -1;
            sortedEntities = oSemanticSet.entities.sort(function (a, b) {
                return a.uri.localeCompare(b.uri);
            });
            for (_j = 0, _len1 = sortedEntities.length; _j < _len1; _j++) {
                ann = sortedEntities[_j];
                if (f === -1 || sortedEntities[f] !== ann) {
                    filteredEntities.push(ann);
                    f++;
                }
            }
            for (_k = 0, _len2 = filteredEntities.length; _k < _len2; _k++) {
                ent = filteredEntities[_k];
                ent.uri = changeUrl(ent.uri);
            }
            mention = oSemanticSet['selected-text'];
            entity = oSemanticSet.entities[0];
            numSuggestions = oSemanticSet.entities.length;
            CKEDITOR.xowl.suggestions[mention.value] = entity.uri;
            CKEDITOR.xowl.entities[mention.value] = oSemanticSet.entities;
        }
    };
    removeSuggestion = function (editor) {
        $(editor.window.getFrame().$).contents().find("[data-cke-annotation=\"" + selectedTextAnnotation + "\"]").replaceWith(selectedTextAnnotation);
        delete CKEDITOR.xowl.suggestions[selectedTextAnnotation];
    };
    openXowlDialog = function (editor) {
        if (!CKEDITOR.xowl || !CKEDITOR.xowl.entities) {
            return;
        }
        editor.openDialog('xowl_dialog');
    };
    fillSuggestionsField = function () {
        suggestions_field.val(JSON.stringify(CKEDITOR.xowl.suggestions));
    };
})(jQuery);
