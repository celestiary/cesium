import { ExternalRenderer, ExternalRendererCollection } from "../../index.js";

describe("Scene/ExternalRendererCollection", function () {
  function createRenderer() {
    return new ExternalRenderer({ render: function () {} });
  }

  it("constructs empty", function () {
    const collection = new ExternalRendererCollection();
    expect(collection.length).toEqual(0);
  });

  it("adds renderers in order", function () {
    const collection = new ExternalRendererCollection();
    const a = createRenderer();
    const b = createRenderer();
    expect(collection.add(a)).toBe(a);
    expect(collection.add(b)).toBe(b);
    expect(collection.length).toEqual(2);
    expect(collection.get(0)).toBe(a);
    expect(collection.get(1)).toBe(b);
    expect(collection.contains(a)).toBe(true);
    expect(collection.contains(b)).toBe(true);
  });

  it("adds a renderer at an index", function () {
    const collection = new ExternalRendererCollection();
    const a = collection.add(createRenderer());
    const b = collection.add(createRenderer(), 0);
    expect(collection.get(0)).toBe(b);
    expect(collection.get(1)).toBe(a);
  });

  it("adds any object with a render function", function () {
    const collection = new ExternalRendererCollection();
    const renderer = { render: function () {} };
    collection.add(renderer);
    expect(collection.contains(renderer)).toBe(true);
  });

  it("removes renderers", function () {
    const collection = new ExternalRendererCollection();
    const a = collection.add(createRenderer());
    const b = collection.add(createRenderer());
    expect(collection.remove(a)).toBe(true);
    expect(collection.remove(a)).toBe(false);
    expect(collection.contains(a)).toBe(false);
    expect(collection.length).toEqual(1);
    expect(collection.get(0)).toBe(b);
  });

  it("removes all renderers", function () {
    const collection = new ExternalRendererCollection();
    collection.add(createRenderer());
    collection.add(createRenderer());
    collection.removeAll();
    expect(collection.length).toEqual(0);
  });

  it("does not contain undefined", function () {
    const collection = new ExternalRendererCollection();
    expect(collection.contains(undefined)).toBe(false);
  });

  it("throws when adding a renderer twice", function () {
    const collection = new ExternalRendererCollection();
    const renderer = collection.add(createRenderer());
    expect(function () {
      collection.add(renderer);
    }).toThrowDeveloperError();
  });

  it("throws when adding without a render function", function () {
    const collection = new ExternalRendererCollection();
    expect(function () {
      collection.add();
    }).toThrowDeveloperError();
    expect(function () {
      collection.add({});
    }).toThrowDeveloperError();
  });

  it("throws when adding at an index out of range", function () {
    const collection = new ExternalRendererCollection();
    expect(function () {
      collection.add(createRenderer(), -1);
    }).toThrowDeveloperError();
    expect(function () {
      collection.add(createRenderer(), 1);
    }).toThrowDeveloperError();
  });
});
