module.exports = (function() {
  function CreateMenu(Menu, MenuItem, app, actions = []) {
    let menu = new Menu()

    actions.forEach(action => {
      menu.append(new MenuItem(action))
    })

    return menu
  }

  return CreateMenu
})()
