injections_controller(function() {

  var log_stack_fifo = [];

  var tab_id = undefined;

  setInterval(function() {
    if(tab_id) {
      var data = log_stack_fifo.shift();

      if(data) {
        chrome.runtime.sendMessage({
          action: 'log_input',
          tab_id: tab_id,
          domain: document.location.host,
          data: data
        });
      }
    }
  }, 0);

  chrome.storage.sync.get(null, function(sync_options) {
    var badge_counter = sync_options['badge_counter'];

    chrome.storage.onChanged.addListener(function(changes, namespace) {
      if(
        namespace == 'sync' && changes
        &&
        changes.newValue && changes.newValue['badge_counter']
      ) {
        badge_counter = changes.newValue['badge_counter'];
      }
    });

    var render_data = function(document_data, tab_id) {
      chrome.storage.local.get(tab_id, function(current_storage_data) {
        var calls = 0;

        if(document_data && document_data['counters']) {
          for(key in document_data['counters']) {
            for(sub_key in document_data['counters'][key]) {
              var allowed = 0;
              var blocked = 0;

              if(badge_counter['sum_by'] == 'executions') {
                allowed = document_data['counters'][key][sub_key]['allowed'];
                blocked = document_data['counters'][key][sub_key]['blocked'];
              } else {
                if(document_data['counters'][key][sub_key]['allowed'] > 0) {
                  allowed = 1;
                }

                if(document_data['counters'][key][sub_key]['blocked'] > 0) {
                  blocked = 1;
                }
              }

              if(badge_counter['kinds'][key]) {
                if(
                  badge_counter['executions'] == 'blocked'
                  ||
                  badge_counter['executions'] == 'allowed_blocked'
                ) {
                  calls += blocked;
                }

                if(
                  badge_counter['executions'] == 'allowed'
                  ||
                  badge_counter['executions'] == 'allowed_blocked'
                ) {
                  calls += allowed;
                }
              }
            }
          }
        } else {
          if(!document_data) document_data = {};
          document_data['counters'] = {};
        }

        tab_id = tab_id.toString();

        var data_to_write = current_storage_data;

        if(!data_to_write) { data_to_write = {}; }
        if(!data_to_write[tab_id]) { data_to_write[tab_id] = {}; }

        data_to_write[tab_id]['badge'] = {
          'text': short_number_for_badge(calls), 'calls': calls
        };

        if(document_data && document_data['domain']) {
          data_to_write[tab_id]['domain'] = document_data['domain'];
        }

        data_to_write[tab_id]['counters'] = document_data['counters'];

        chrome.storage.local.set(data_to_write);
      });
    }

    document.getElementById('luminous-data').addEventListener(
      'luminous-message', function(e) {
        var data = e.data;

        log_stack_fifo.push(data);
      }
    );

    var get_tab_id = setInterval(function() {
      var data_element = document.getElementById('luminous-data');

      if(data_element) {
        tab_id = data_element.getAttribute('data-tab');
      }

      clearInterval(get_tab_id);
    }, 300);
  });
});
