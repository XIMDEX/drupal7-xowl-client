# Xowl-service client for drupal 7
This client allows you to enrich your content managed into Drupal with a semantic layer. You can test this service online here: http://demo.ximdex.com/xowl/

## Requirements
* Drupal 7 core: https://www.drupal.org/project/drupal
* module ckeditor for Drupal 7: http://ftp.drupal.org/files/projects/ckeditor-7.x-1.16.tar.gz
* module jquery_update: http://ftp.drupal.org/files/projects/jquery_update-7.x-2.5.tar.gz
* module Xowl for Drupal 7 (latest release v1.0): https://github.com/XIMDEX/drupal7-xowl-client/archive/v1.0.tar.gz

## Installing Xowl module
* Install drupal 7 on your server as usual (more info [here](https://www.drupal.org/documentation/install/beginners)). 
* Go to the following folder (<DRUPAL_ROOT> is your Drupal root path): <DRUPAL_ROOT>/sites/all/modules/.
* Unzip all the downloaded drupal modules into this folder. At the end, you must have three folders, named: *ckeditor*, *drupal7-xowl-client*, *jquery_update*.
* Access to your drupal web interface using a browser and select *modules* on the main menu. You'll see the Xowl module at the end of the list, but you can not install it yet because it depends on other two, **jquery_update** and **ckeditor**, so you have to enable them first.

![Installing Xowl module and its dependencies](/resources/images/drupal7_xowl_1.png)

* If all the three modules are properly enabled, you are be able to configure them in the next step.

## Configuring all the new stuff
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

## Notes
This project is related with the client for drupal 8. Given that both drupal 7 and 8 have a very different structure, we have separated sub-projects.

* Xowl service client for drupal 8: https://github.com/XIMDEX/drupal8-xowl-client
