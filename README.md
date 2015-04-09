# Xowl-service client for drupal 7
This client allows you to enrich your content managed into Drupal with a semantic layer. You can test this service on-line here: http://demo.ximdex.com/xowl/

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

If all the three modules are now properly enabled (in green), you are ready to configure them in the next step.

![Modules installed](/resources/images/drupal7_xowl_2.png)

## Configuring all the new stuff

### Xowl service

Start configuring the Xowl module. Access to its configuration on the tab called *Xowl Configuration* above or on the modules list, on the Xowl module's *Configure* link.

You have to select the content types that your are going to use to write your content and enrich it. Save the changes.

![configuring Content Types](/resources/images/drupal7_xowl_3.png)

To configure the service's URL, go to the another configuration link called *Xowl Server Configuration* and enter a valid Xowl service URL:

![configuring the service's URL](/resources/images/drupal7_xowl_4.png)

### CKeditor

You also have to configure the **CKeditor** to integrate properly a custom button for Xowl requests with your content.

![Configuring CKeditor](/resources/images/drupal7_xowl_5.png)

![CKeditor global profile](/resources/images/drupal7_xowl_6.png)

Check "Use toolbar Drag&Drop feature" as disabled.

![Disabling ](/resources/images/drupal7_xowl_7.png)

To insert the own CSS of the Xowl module into CKeditor, go to configure -> Profiles -> Full -> edit

Select the *Expand css* option and set the input *file path* with the following value:

%hsites/all/modules/drupal7-xowl-client/resources/css/xowl.css. 

Next to css: **Editor Appearance**, add under "Maximize" a new item to the list: **['xowl_enhance_plugin_button']**

Save all the changes made.

## Usage

To use this enrichment service, log in into your Drupal CMS and click on "Add new content" link and create, for example, a new article. 

On the edition page, select *Full Html* text format on CKeditor options. Its toolbar will change and you'll see a new button at the end of the third row. Write something that make sense, like: "This is a free text about Albert Einstein and Karl Marx" and then click on the Xowl button.

The text "Albert Einstein" will be highlighted with a color and a number. We can click on it to select the correct dbpedia entity. Now we can save and see on the text became a link to dbpedia uri that represents that entity.

## Notes

We have been working hard to this client for the brand new Drupal 8 stable release. As you may know that there have been so many changes between Drupal 7 and 8, so our clients have a very different structure.

You can find our **Xowl service client** for Drupal 8 [here](https://github.com/XIMDEX/drupal8-xowl-client).
