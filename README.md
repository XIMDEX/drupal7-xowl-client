# Xowl service client for drupal 7

## Notes
This project is related with the client for drupal 8. Given that both drupal 7 and 8 have a very different structure, we have separated sub-projects.

* Xowl service client for drupal 8: https://github.com/XIMDEX/drupal8-xowl-client

## Requirement
* drupal 7: https://www.drupal.org/project/drupal
* módulo ckeditor para drupal 7: http://ftp.drupal.org/files/projects/ckeditor-7.x-1.16.tar.gz
* módulo jquery_update: http://ftp.drupal.org/files/projects/jquery_update-7.x-2.5.tar.gz
* módulo xowl: https://github.com/XIMDEX/drupal7-xowl-client.git

## Setup
* Install drupal 7. Check rwx permission are correct.
* Go to folder: /DRUPAL_ROOT/sites/all/modules/.
* Unzip the 3 drupal modules in this folder. We must have 3 folders: *ckeditor*, *drupal7-xowl-client*, *jquery_update*.
* Access drupal from your internet browser, select *modules*. We'll see xowl at the end of the list. We can not install it now because it depends on the other two, so let's install them first.
* Configure ckeditor: configure -> CKEditor Global Profile -> edit. Check "Use toolbar Drag&Drop feature" as disabled.
* more on ckeditor: configure -> Profiles -> Full -> edit. Expand *css* -> set *file path*: %hsites/all/modules/drupal7-xowl-client/resources/css/xowl.css. Next to css: **Editor Appearance**, add under "Maximize" a new item to the list: **['xowl_enhance_plugin_button']**
* Save all changes.

## Configure
We can configure the module at modules -> xowl -> configure or in the new button *Xowl configuration*. We have two options:

 * Xowl Content Type selection: Select what kind of content we can analize.
 * Xowl server configuration: Full url to access the service.

## Use
Login in portal and click on "add content" -> article. Select text format -> Full Html in ckeditor. Buttons will change and we'll see the last button on third row at the right. Let's write something like: "this is a free text about Albert Einstein" and click on the button.

The text "Albert Einstein" will be highlighted with a color and a number. We can click on it to select the correct dbpedia entity. Now we can save and see on the text became a link to dbpedia uri that represents that entity.
