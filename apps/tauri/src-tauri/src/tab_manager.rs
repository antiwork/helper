extern crate lazy_static;
use crate::utils;
use crate::{ACTIVE_TAB, NEXT_TAB_ID, TAB_TITLES, TAB_WEBVIEWS};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::webview::PageLoadEvent;
use tauri::{Emitter, LogicalPosition, LogicalSize, Manager, WebviewBuilder, WebviewUrl};

pub fn add_tab(
    app: tauri::AppHandle,
    window: tauri::Window,
    url: String,
) -> Result<String, String> {
    log::info!("Adding tab: {}", url);
    let mut tab_id = NEXT_TAB_ID.lock().unwrap();
    let id = format!("tab_{}", *tab_id);
    *tab_id += 1;

    let size = window.inner_size().unwrap();
    let scale_factor = window.scale_factor().unwrap();
    let logical_size: LogicalSize<f32> = size.to_logical(scale_factor);

    let parsed_url = tauri::Url::parse(&url).map_err(|e| e.to_string())?;

    {
        let mut tab_titles = TAB_TITLES.lock().unwrap();
        tab_titles.insert(id.clone(), "".to_string());
    }

    let background_color = utils::get_background_color(&window);
    let app_for_page_load = app.clone();
    let id_for_page_load = id.clone();
    let webview = window
        .add_child(
            WebviewBuilder::new(&id, WebviewUrl::External(parsed_url))
                .disable_drag_drop_handler()
                .background_color(background_color)
                .on_page_load(move |_, payload| {
                    if let PageLoadEvent::Finished = payload.event() {
                        set_active_tab(app_for_page_load.clone(), id_for_page_load.clone())
                            .map_err(|e| e.to_string())
                            .unwrap();
                    }
                }),
            LogicalPosition::new(0., 40.),
            LogicalSize::new(logical_size.width, logical_size.height - 40.),
        )
        .unwrap();

    let _ = webview.hide();

    let is_first_tab;
    {
        let mut tab_webviews = TAB_WEBVIEWS.lock().unwrap();
        is_first_tab = tab_webviews.is_empty();
        tab_webviews.insert(id.clone(), webview);
    }

    if is_first_tab {
        if let Some(tab_bar) = window.get_webview("tab_bar") {
            let _ = tab_bar.set_size(LogicalSize::new(logical_size.width, 40.));
        }
    }

    emit_tab_bar_update(app);

    Ok(id)
}

pub fn set_active_tab(app: tauri::AppHandle, tab_id: String) -> Result<(), String> {
    {
        let tab_webviews = TAB_WEBVIEWS.lock().unwrap();

        if !tab_webviews.contains_key(&tab_id) {
            return Err(format!("Tab with id {} not found", tab_id));
        }

        for (_, webview) in tab_webviews.iter() {
            let _ = webview.hide();
        }

        if let Some(webview) = tab_webviews.get(&tab_id) {
            webview.show().map_err(|e| e.to_string())?;
        }
    }

    {
        let mut active_tab = ACTIVE_TAB.lock().unwrap();
        *active_tab = Some(tab_id);
    }

    emit_tab_bar_update(app);

    Ok(())
}

pub fn close_tab(
    app: tauri::AppHandle,
    window: tauri::Window,
    tab_id: String,
) -> Result<Option<String>, String> {
    let new_active_id_option;
    let is_tab_empty;
    let current_active_id;

    {
        let active_tab = ACTIVE_TAB.lock().unwrap();
        current_active_id = active_tab.clone();
    }

    {
        let mut tab_titles = TAB_TITLES.lock().unwrap();
        tab_titles.remove(&tab_id);
    }

    {
        let mut tab_webviews = TAB_WEBVIEWS.lock().unwrap();

        if !tab_webviews.contains_key(&tab_id) {
            return Err(format!("Tab with id {} not found", tab_id));
        }

        tab_webviews.remove(&tab_id);
        is_tab_empty = tab_webviews.is_empty();

        let tab_was_active = current_active_id.as_ref().map_or(false, |id| id == &tab_id);

        if is_tab_empty {
            new_active_id_option = None;
        } else if tab_was_active {
            new_active_id_option = tab_webviews.keys().next().cloned();

            // Show the new active tab if there is one
            if let Some(ref new_id) = new_active_id_option {
                if let Some(webview) = tab_webviews.get(new_id) {
                    let _ = webview.show();
                }
            }
        } else {
            new_active_id_option = current_active_id;
        }
    }

    if is_tab_empty {
        let size = window.inner_size().unwrap();
        let scale_factor = window.scale_factor().unwrap();
        let logical_size: LogicalSize<f32> = size.to_logical(scale_factor);

        if let Some(tab_bar) = window.get_webview("tab_bar") {
            let _ = tab_bar.set_size(LogicalSize::new(logical_size.width, logical_size.height));
        }
    }

    {
        let mut active_tab = ACTIVE_TAB.lock().unwrap();
        *active_tab = new_active_id_option.clone();
    }

    emit_tab_bar_update(app);

    Ok(new_active_id_option)
}

pub fn update_tab(app: tauri::AppHandle, tab_id: String, title: String) -> Result<(), String> {
    let mut tab_titles = TAB_TITLES.lock().unwrap();

    if !tab_titles.contains_key(&tab_id) {
        return Err(format!("Tab with id {} not found", tab_id));
    }

    tab_titles.insert(tab_id, title);

    emit_tab_bar_update(app);

    Ok(())
}

fn emit_tab_bar_update(app: tauri::AppHandle) {
    let tab_webviews = TAB_WEBVIEWS.lock().unwrap();
    let active_tab = ACTIVE_TAB.lock().unwrap();
    let tab_titles = TAB_TITLES.lock().unwrap();

    let tab_info = tab_webviews
        .iter()
        .map(|(id, webview)| {
            let url = webview.url().unwrap().to_string();
            let title = tab_titles.get(id).cloned().unwrap_or_default();

            serde_json::json!({
                "id": id,
                "title": title,
                "url": url,
            })
        })
        .collect::<Vec<_>>();

    app.emit(
        "tab-bar-update",
        serde_json::json!({
            "tabs": tab_info,
            "activeTab": active_tab.clone(),
        }),
    )
    .unwrap();
}
