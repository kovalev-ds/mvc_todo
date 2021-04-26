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

// static class to create DOM Elements
class UI {
  // static config = {
  //   markup: "",
  //   attrs: {},
  //   events: {},
  //   children: null,
  // };

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

UI.config = { markup: "", attrs: {}, events: {}, children: null };

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
        { filter: "all", title: "All" },
        { filter: "active", title: "Active" },
        { filter: "completed", title: "Completed" },
      ].map(item =>
        UI.create("li", {
          children: [
            UI.create("button", {
              attrs: {
                class: `filter__button`,
                "data-filter": item.filter,
              },
              markup: item.title,
              events: {
                click: () => {
                  this.handleFilterChange(item.filter);
                  this.updateActiveFilter(item.filter);
                },
              },
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

  bindFilterChange(cb) {
    this.handleFilterChange = filter => {
      cb(filter);
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

  updateActiveFilter(filter) {
    [].forEach.call(this.filtersUI.children, el => {
      el.children[0].classList.remove("filter__button--active");
      el.children[0].dataset.filter === filter &&
        el.children[0].classList.add("filter__button--active");
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
    this.view = new View(opts.container);
    this.model = new Model(opts.id);
    this.filterMode = "all";

    TodoApp.count++;
  }

  _filter(filter, item) {
    if (filter === "active") return !item.completed;
    if (filter === "completed") return item.completed;
    return true;
  }

  onTodoListChanged = todos => {
    this.view.updateTodoList(
      todos.filter(item => this._filter(this.filterMode, item))
    );
    this.view.updateCounter(todos.filter(item => !item.completed).length);
  };

  onFilterChanged = filter => {
    this.filterMode = filter;
    this.model.getAll(todos => {
      this.view.updateTodoList(
        todos.filter(item => this._filter(this.filterMode, item))
      );
    });
  };

  handleAddTask = data => {
    if (!data.title.trim()) return;

    const task = {
      id: Math.floor(Math.random() * Date.now()),
      completed: false,
      title: data.title.trim(),
    };

    this.model.add(task);
  };
  handleEditTodo = (id, data) => this.model.edit(id, data);
  handleDeleteTodo = id => this.model.delete(id);
  handleToggleTodo = id => this.model.toggle(id);

  init() {
    this.view.initUI();
    this.view.updateActiveFilter(this.filterMode);

    this.model.getAll(todos => {
      this.view.updateTodoList(
        todos.filter(item => this._filter(this.filterMode, item))
      );
      this.view.updateCounter(todos.filter(item => !item.completed).length);
    });

    this.view.bindFormSubmit(this.handleAddTask);
    this.view.bindTaskDelete(this.handleDeleteTodo);
    this.view.bindTaskComplete(this.handleToggleTodo);
    this.view.bindTaskEdit(this.handleEditTodo);
    this.view.bindFilterChange(this.onFilterChanged);
    this.model.bindTodoListChanged(this.onTodoListChanged);
  }
}

TodoApp.count = 0;

const createTodoApp = opts => {
  const { id, container } = opts;
  if (TodoApp.count >= 10000)
    throw new Error("You cant create more than 10000 instances");

  return new TodoApp({ id, container });
};

createTodoApp({ id: "first", container: "#root" }).init();
createTodoApp({ id: "second", container: "#root" }).init();
