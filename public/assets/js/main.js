class Model {
  constructor(appID = "app") {
    let caches;

    this.getStorage = () =>
      caches || JSON.parse(window.localStorage.getItem(appID)) || [];

    this.setStorage = data => {
      caches = data;
      window.localStorage.setItem(appID, JSON.stringify(data));
    };
  }

  bindTodoListChanged(cb) {
    this.notify = cb;
  }

  _commit(data) {
    this.setStorage(data);
    this.notify(data);
  }

  add(item) {
    const data = this.getStorage();
    data.push(item);

    this._commit(data);
  }

  delete(id) {
    const data = this.getStorage().filter(item => item.id !== id);
    this._commit(data);
  }

  edit(id, payload) {
    const data = this.getStorage().map(item =>
      item.id === id ? Object.assign({}, item, payload) : item
    );
    this._commit(data);
  }

  toggle(id) {
    const data = this.getStorage().map(item =>
      item.id === id
        ? Object.assign({}, item, { completed: !item.completed })
        : item
    );
    this._commit(data);
  }

  getAll(cb) {
    cb(this.getStorage());
  }
}

// simple class to create DOM Elements
class UI {
  static config = {
    markup: "",
    attrs: {},
    events: {},
    children: null,
  };

  static create(tag, opts) {
    const { attrs, events, markup, children } = Object.assign(
      {},
      UI.config,
      opts
    );

    const el = document.createElement(tag);
    el.innerHTML = markup;

    Object.keys(attrs).forEach(a => attrs[a] && el.setAttribute(a, attrs[a]));
    Object.keys(events).forEach(eType => {
      el.addEventListener(eType, e => events[eType](e));
    });

    if (children && Array.isArray(children)) {
      children.forEach(child => child.nodeType === 1 && el.append(child));
    }

    return el;
  }
}

class View {
  constructor(selector) {
    this.parentNode = document.querySelector(selector) || document.body;

    this.todoListUI = UI.create("ul", {
      attrs: { class: "list" },
    });

    this.counterUI = UI.create("div", {
      markup: "0 tasks left",
      attrs: { class: "counter" },
    });

    this.filtersUI = UI.create("ul", {
      attrs: {
        class: "filter",
      },
      children: [
        { href: "#", title: "All" },
        { href: "#active", title: "Active" },
        { href: "#completed", title: "Completed" },
      ].map(link =>
        UI.create("li", {
          children: [
            UI.create("a", {
              attrs: {
                href: link.href,
                class: `filter__link`,
              },
              markup: link.title,
            }),
          ],
        })
      ),
    });
    this.formUI = UI.create("form", {
      attrs: {
        class: "add-form",
      },
      events: {
        keydown: e => e.keyCode === 27 && e.currentTarget.reset(),
      },
      children: [
        UI.create("input", {
          attrs: {
            name: "title",
            type: "text",
            class: "add-form__input",
            autofocus: true,
            autocomplete: "off",
            placeholder: "What needs to be done?",
          },
        }),
        UI.create("button", {
          markup: "Add task",
          attrs: {
            class: "add-form__submit hidden",
            type: "submit",
          },
        }),
      ],
    });

    this.appUI = UI.create("section", {
      attrs: { class: "app" },
      children: [
        UI.create("h1", {
          attrs: { class: "app__title" },
          markup: "todo app",
        }),
        UI.create("div", {
          attrs: { class: "app__tools" },
          children: [this.counterUI, this.filtersUI],
        }),
        this.formUI,
        UI.create("main", {
          attrs: { class: "app__content" },
          children: [this.todoListUI],
        }),
      ],
    });
  }

  bindTaskComplete(cb) {
    this.handleTaskComplete = id => {
      cb(id);
    };
  }

  bindTaskDelete(cb) {
    this.handleTaskDelete = id => {
      cb(id);
    };
  }

  bindTaskEdit(cb) {
    this.handleTaskEdit = (id, data) => {
      cb(id, data);
    };
  }

  bindFormSubmit(cb) {
    this.formUI.addEventListener("submit", event => {
      event.preventDefault();

      // form control must have [name] attr.
      const data = [...new FormData(event.currentTarget)].reduce(
        (obj, [key, val]) => {
          obj[key] = val;
          return obj;
        },
        {}
      );
      cb(data);

      event.currentTarget.reset();
    });
  }

  updateActiveFilter() {
    [].forEach.call(this.filtersUI.children, el => {
      el.children[0].classList.remove("filter__link--active");
      el.children[0].hash === location.hash &&
        el.children[0].classList.add("filter__link--active");
    });
  }

  updateTodoList(todos = []) {
    while (this.todoListUI.firstChild) {
      this.todoListUI.removeChild(this.todoListUI.firstChild);
    }

    if (todos.length === 0) {
      this.todoListUI.append(
        UI.create("div", {
          attrs: {
            class: "not-found",
          },
          markup: "Not found a task.",
        })
      );
      return;
    }

    const list = todos.map(todo => {
      return UI.create("li", {
        attrs: { class: "list__item" },
        children: [
          UI.create("div", {
            attrs: {
              class: `task ${todo.completed ? "task--completed" : ""}`,
            },
            children: [
              UI.create("input", {
                attrs: {
                  type: "checkbox",
                  class: "task__checkbox",
                  checked: todo.completed || null,
                },
                events: {
                  change: () => this.handleTaskComplete(todo.id),
                },
              }),
              UI.create("div", {
                attrs: { class: "task__title", contenteditable: true },
                markup: todo.title,
                events: {
                  keydown: e => {
                    e.keyCode === 27 && e.target.blur();

                    e.keyCode === 13 &&
                      this.handleTaskEdit(todo.id, {
                        title: e.target.innerText.trim(),
                      });
                  },
                  focusout: e => {
                    e.target.innerText = todo.title;
                  },
                },
              }),
              UI.create("button", {
                attrs: { class: "task__destroy" },
                markup: "&times;",
                events: {
                  click: () => this.handleTaskDelete(todo.id),
                },
              }),
            ],
          }),
        ],
      });
    });

    this.todoListUI.append(...list);
  }

  updateCounter(quantity) {
    this.counterUI.innerHTML =
      quantity > 1 ? `${quantity} tasks left.` : `${quantity} task left`;
  }

  initUI() {
    this.parentNode.append(this.appUI);
  }
}

class TodoApp {
  constructor(opts) {
    this.view = new View(opts.el);
    this.model = new Model(opts.appID);
  }

  init() {
    this.view.initUI();
    this.view.bindFormSubmit(data => {
      const task = {
        id: Math.floor(Math.random() * Date.now()),
        completed: false,
        title: data.title,
      };

      this.model.add(task);
    });

    this.view.bindTaskDelete(id => this.model.delete(id));
    this.view.bindTaskComplete(id => this.model.toggle(id));
    this.view.bindTaskEdit((id, data) => this.model.edit(id, data));

    this.model.bindTodoListChanged(todos => {
      this.view.updateTodoList(todos.filter(item => filterByHash(item)));
      this.view.updateCounter(todos.filter(item => !item.completed).length);
    });

    this.model.getAll(todos => {
      this.view.updateActiveFilter();
      this.view.updateTodoList(todos.filter(item => filterByHash(item)));
      this.view.updateCounter(todos.filter(item => !item.completed).length);
    });

    window.addEventListener("hashchange", () => {
      this.model.getAll(todos => {
        this.view.updateTodoList(todos.filter(item => filterByHash(item)));
        this.view.updateActiveFilter();
      });
    });
  }
}

// utils

const filterByHash = item => {
  const { hash } = location;
  if (hash === "#active") return !item.completed;
  if (hash === "#completed") return item.completed;
  return true;
};

new TodoApp({
  appID: "todo",
  el: "#root",
}).init();
