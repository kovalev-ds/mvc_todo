class Model {
  constructor(appID = "todoApp") {
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

  _commit(todos) {
    this.setStorage(todos);
    this.notify(todos);
  }

  add(task) {
    const todos = this.getStorage();
    todos.push(task);

    this._commit(todos);
  }

  delete(id) {
    const todos = this.getStorage().filter(item => item.id !== id);
    this._commit(todos);
  }

  edit(id, data) {
    const todos = this.getStorage().map(item =>
      item.id === id ? Object.assign({}, item, data) : item
    );
    this._commit(todos);
  }

  toggle(id) {
    const todos = this.getStorage().map(item =>
      item.id === id
        ? Object.assign({}, item, { completed: !item.completed })
        : item
    );
    this._commit(todos);
  }
  getAll(cb) {
    cb(this.getStorage());
  }
}

class UICreator {
  constructor() {
    this.config = {
      markup: "",
      attrs: {},
      events: {},
      children: null,
    };
  }

  createUI(tag, opts) {
    const { attrs, events, markup, children } = Object.assign(
      {},
      this.config,
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

class View extends UICreator {
  constructor(selector) {
    super();

    this.parentNode = document.querySelector(selector) || document.body;

    this.todoListUI = this.createUI("ul", {
      attrs: { class: "list" },
    });

    this.counterUI = this.createUI("div", {
      markup: "0 tasks left",
      attrs: { class: "counter" },
    });

    this.filtersUI = this.createUI("ul", {
      attrs: {
        class: "filter",
        id: "filter",
      },
      children: [
        { href: "#", title: "All" },
        { href: "#active", title: "Active" },
        { href: "#completed", title: "Completed" },
      ].map(link =>
        this.createUI("li", {
          children: [
            this.createUI("a", {
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
    this.formUI = this.createUI("form", {
      attrs: {
        class: "add-form",
        id: "add-form",
      },
      children: [
        this.createUI("input", {
          attrs: {
            name: "title",
            type: "text",
            class: "add-form__input",
            autofocus: true,
            autocomplete: "off",
            placeholder: "What needs to be done?",
          },
        }),
        this.createUI("button", {
          markup: "Add task",
          attrs: {
            class: "add-form__submit hidden",
          },
        }),
      ],
    });

    this.appUI = this.createUI("section", {
      attrs: { class: "app" },
      children: [
        this.createUI("h1", {
          attrs: { class: "app__title" },
          markup: "todo app",
        }),
        this.createUI("div", {
          attrs: { class: "app__tools" },
          children: [this.counterUI, this.filtersUI],
        }),
        this.formUI,
        this.createUI("main", {
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
        this.createUI("div", {
          markup: "You dont have any todos yet. Add one?",
        })
      );
      return;
    }

    const list = todos.map(todo => {
      return this.createUI("li", {
        attrs: { class: "list__item" },
        children: [
          this.createUI("div", {
            attrs: {
              class: `task ${todo.completed ? "task--completed" : ""}`,
              ["data-id"]: todo.id,
            },
            children: [
              this.createUI("input", {
                attrs: {
                  type: "checkbox",
                  class: "task__checkbox",
                  checked: todo.completed || null,
                },
                events: {
                  change: () => this.handleTaskComplete(todo.id),
                },
              }),
              this.createUI("div", {
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
              this.createUI("button", {
                attrs: { class: "task__destroy" },
                markup: "delete",
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

    this.model.bindTodoListChanged(todos => this.updateViewComponents(todos));
    this.model.getAll(todos => {
      this.updateViewComponents(todos);
      this.view.updateActiveFilter();
    });
  }

  updateViewComponents(todos) {
    this.view.updateTodoList(
      todos.filter(item => {
        switch (location.hash) {
          case "#active":
            return !item.completed;
          case "#completed":
            return item.completed;
          default:
            return true;
        }
      })
    );
    this.view.updateCounter(todos.filter(item => !item.completed).length);
  }

  bindListeners() {
    this.view.bindFormSubmit(data => {
      const task = {
        id: Math.floor(Math.random() * Date.now()),
        completed: false,
        title: data.title,
      };

      this.model.add(task);
    });

    this.view.bindTaskDelete(id => {
      this.model.delete(id);
    });

    this.view.bindTaskComplete(id => {
      this.model.toggle(id);
    });

    this.view.bindTaskEdit((id, data) => {
      this.model.edit(id, data);
    });
  }

  init() {
    this.view.initUI();
    this.bindListeners();
    window.addEventListener("hashchange", () => {
      this.model.getAll(todos => {
        this.updateViewComponents(todos);
        this.view.updateActiveFilter();
      });
    });
  }
}

new TodoApp({
  el: "#root",
  appID: "hohoho",
}).init();
