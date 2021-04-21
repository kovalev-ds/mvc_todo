class UICreator {
  constructor() {
    this.config = {
      tag: "div",
      markup: "",
      attrs: {},
      events: {},
      container: null,
      children: null,
    };
  }

  createUI(opts) {
    const { tag, attrs, events, markup, container, children } = Object.assign(
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
      children.forEach(child => {
        child.nodeType === 1
          ? el.append(child)
          : this.createUI(Object.assign({}, child, { container: el }));
      });
    }

    if (container) {
      container.append(el);
    }

    return el;
  }
}

class View extends UICreator {
  constructor(selector) {
    super();
    this.parentNode = document.querySelector(selector) || document.body;

    this.todoListUI = this.createUI({
      tag: "ul",
      attrs: { class: "list" },
    });

    this.counterUI = this.createUI({
      markup: "0 tasks left",
      attrs: { class: "counter" },
    });

    this.formUI = this.createUI({
      tag: "form",
      attrs: {
        class: "add-form",
        id: "add-form",
      },
      children: [
        {
          tag: "input",
          attrs: {
            name: "title",
            type: "text",
            class: "add-form__input",
            autofocus: true,
            autocomplete: "off",
            placeholder: "What needs to be done?",
          },
        },
        {
          tag: "button",
          markup: "Add task",
          attrs: {
            class: "add-form__submit hidden",
          },
        },
      ],
    });

    this.appUI = this.createUI({
      tag: "section",
      attrs: { class: "app" },
      children: [
        { tag: "h1", attrs: { class: "app__title" }, markup: "todo app" },
        {
          attrs: { class: "app__tools" },
          children: [
            this.counterUI,
            {
              tag: "ul",
              attrs: {
                class: "filter",
                id: "filter",
              },
              children: [
                { href: "#", title: "All" },
                { href: "#active", title: "Active" },
                { href: "#completed", title: "Completed" },
              ].map(item => ({
                tag: "li",
                children: [
                  {
                    tag: "a",
                    attrs: {
                      href: item.href,
                      class: "filter__link",
                    },
                    markup: item.title,
                  },
                ],
              })),
            },
          ],
        },
        this.formUI,
        {
          tag: "main",
          attrs: { class: "app__content" },
          children: [this.todoListUI],
        },
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

  handleFormSubmit(cb) {
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

  updateTodoList(todos = []) {
    const list = todos.map(todo => {
      return this.createUI({
        tag: "li",
        attrs: { class: "list__item" },
        children: [
          {
            attrs: {
              class: ["task", todo.completed ? "task--completed" : ""].join(
                " "
              ),
              ["data-id"]: todo.id,
            },
            children: [
              {
                tag: "input",
                attrs: {
                  type: "checkbox",
                  class: "task__checkbox",
                  checked: todo.completed || null,
                },
                events: {
                  change: () => this.handleTaskComplete(todo.id),
                },
              },
              { attrs: { class: "task__title" }, markup: todo.title },
              {
                tag: "button",
                attrs: { class: "task__destroy" },
                markup: "delete",
                events: {
                  click: () => this.handleTaskDelete(todo.id),
                },
              },
            ],
          },
        ],
      });
    });

    while (this.todoListUI.firstChild) {
      this.todoListUI.removeChild(this.todoListUI.firstChild);
    }

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

class Model {
  constructor(name = "todo-app") {
    let caches;

    this.getStorage = () =>
      caches || JSON.parse(window.localStorage.getItem(name)) || [];

    this.setStorage = data => {
      caches = data;
      window.localStorage.setItem(name, JSON.stringify(data));
    };
  }

  onTodoListChanged(cb) {
    this.notify = cb;
  }

  add(task) {
    const todos = this.getStorage();
    todos.push(task);

    this.setStorage(todos);
    this.notify(todos);
  }
  delete(id) {
    const todos = this.getStorage().filter(item => item.id !== id);
    this.setStorage(todos);
    this.notify(todos);
  }

  edit(id, data) {
    this.items = this.items.map(item =>
      item.id === id ? Object.assign({}, item, data) : item
    );
  }
  toggle(id) {
    const todos = this.getStorage().map(item =>
      item.id === id
        ? Object.assign({}, item, { completed: !item.completed })
        : item
    );
    this.setStorage(todos);
    this.notify(todos);
  }
  find(cb) {
    const todos = this.getStorage();
    cb(todos);
  }
}

class TodoApp {
  constructor(opts) {
    this.view = new View(opts.el);
    this.model = new Model();

    this.model.find(todos => {
      this.view.updateTodoList(todos);
      this.view.updateCounter(todos.filter(item => !item.completed).length);
    });
  }

  bindListeners() {
    this.view.handleFormSubmit(data => {
      const task = {
        id: Math.floor(Math.PI * Date.now()),
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

    this.model.onTodoListChanged(todos => {
      this.view.updateTodoList(todos);
      this.view.updateCounter(todos.filter(item => !item.completed).length);
    });
  }

  init() {
    this.view.initUI();
    this.bindListeners();
  }
}

new TodoApp({
  el: "#root",
}).init();
