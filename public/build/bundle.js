
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.23.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\Nav.svelte generated by Svelte v3.23.2 */

    const file = "src\\Nav.svelte";

    function create_fragment(ctx) {
    	let nav;
    	let ul;
    	let li0;
    	let a0;
    	let t1;
    	let li1;
    	let a1;
    	let t3;
    	let li2;
    	let a2;

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			a0.textContent = "Home";
    			t1 = space();
    			li1 = element("li");
    			a1 = element("a");
    			a1.textContent = "Blog";
    			t3 = space();
    			li2 = element("li");
    			a2 = element("a");
    			a2.textContent = "About";
    			attr_dev(a0, "href", "#top");
    			add_location(a0, file, 2, 12, 29);
    			attr_dev(li0, "class", "svelte-zpkqlj");
    			add_location(li0, file, 2, 8, 25);
    			attr_dev(a1, "href", "#blog");
    			add_location(a1, file, 3, 12, 71);
    			attr_dev(li1, "class", "svelte-zpkqlj");
    			add_location(li1, file, 3, 8, 67);
    			attr_dev(a2, "href", "#about");
    			add_location(a2, file, 4, 12, 114);
    			attr_dev(li2, "class", "svelte-zpkqlj");
    			add_location(li2, file, 4, 8, 110);
    			attr_dev(ul, "class", "svelte-zpkqlj");
    			add_location(ul, file, 1, 4, 11);
    			attr_dev(nav, "class", "svelte-zpkqlj");
    			add_location(nav, file, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(ul, t1);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(ul, t3);
    			append_dev(ul, li2);
    			append_dev(li2, a2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Nav> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Nav", $$slots, []);
    	return [];
    }

    class Nav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Nav",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src\Top.svelte generated by Svelte v3.23.2 */

    const file$1 = "src\\Top.svelte";

    function create_fragment$1(ctx) {
    	let div3;
    	let div0;
    	let t1;
    	let div1;
    	let t3;
    	let div2;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			div0.textContent = "Front End";
    			t1 = space();
    			div1 = element("div");
    			div1.textContent = "Developer";
    			t3 = space();
    			div2 = element("div");
    			div2.textContent = "Minseop";
    			attr_dev(div0, "class", "title expand a");
    			add_location(div0, file$1, 1, 4, 38);
    			attr_dev(div1, "class", "title expand b");
    			add_location(div1, file$1, 2, 4, 87);
    			attr_dev(div2, "class", "title expand c");
    			add_location(div2, file$1, 3, 4, 136);
    			attr_dev(div3, "id", "top");
    			attr_dev(div3, "class", "container");
    			add_location(div3, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div3, t1);
    			append_dev(div3, div1);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Top> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Top", $$slots, []);
    	return [];
    }

    class Top extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Top",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\Blog.svelte generated by Svelte v3.23.2 */

    const file$2 = "src\\Blog.svelte";

    function create_fragment$2(ctx) {
    	let div2;
    	let div0;
    	let t1;
    	let div1;
    	let a0;
    	let t3;
    	let a1;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "Blog";
    			t1 = space();
    			div1 = element("div");
    			a0 = element("a");
    			a0.textContent = "emessell.tistory.com";
    			t3 = space();
    			a1 = element("a");
    			a1.textContent = "emessell.github.io";
    			attr_dev(div0, "class", "title svelte-1kvqz3c");
    			add_location(div0, file$2, 1, 4, 39);
    			attr_dev(a0, "href", "https://emessell.tistory.com/");
    			attr_dev(a0, "class", "underline svelte-1kvqz3c");
    			add_location(a0, file$2, 3, 8, 107);
    			attr_dev(a1, "href", "https://emessell.github.io/");
    			attr_dev(a1, "class", "underline svelte-1kvqz3c");
    			add_location(a1, file$2, 4, 8, 199);
    			attr_dev(div1, "class", "goto_blog svelte-1kvqz3c");
    			add_location(div1, file$2, 2, 4, 74);
    			attr_dev(div2, "id", "blog");
    			attr_dev(div2, "class", "container");
    			add_location(div2, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			append_dev(div1, a0);
    			append_dev(div1, t3);
    			append_dev(div1, a1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Blog> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Blog", $$slots, []);
    	return [];
    }

    class Blog extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Blog",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\About.svelte generated by Svelte v3.23.2 */

    const file$3 = "src\\About.svelte";

    function create_fragment$3(ctx) {
    	let div6;
    	let div0;
    	let t1;
    	let div5;
    	let div3;
    	let h30;
    	let t3;
    	let div1;
    	let t5;
    	let ul0;
    	let li0;
    	let t7;
    	let li1;
    	let t9;
    	let li2;
    	let t11;
    	let li3;
    	let t13;
    	let li4;
    	let t15;
    	let div2;
    	let t17;
    	let ul1;
    	let li5;
    	let t19;
    	let li6;
    	let t21;
    	let li7;
    	let t23;
    	let li8;
    	let t25;
    	let li9;
    	let t27;
    	let li10;
    	let t29;
    	let li11;
    	let t31;
    	let li12;
    	let t33;
    	let div4;
    	let h31;

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div0 = element("div");
    			div0.textContent = "Background";
    			t1 = space();
    			div5 = element("div");
    			div3 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Cancelmarket";
    			t3 = space();
    			div1 = element("div");
    			div1.textContent = "Projects";
    			t5 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			li0.textContent = "1. 서비스 웹 VER.1";
    			t7 = space();
    			li1 = element("li");
    			li1.textContent = "2. 서비스 웹 VER.2";
    			t9 = space();
    			li2 = element("li");
    			li2.textContent = "3. 호텔 관리자 웹";
    			t11 = space();
    			li3 = element("li");
    			li3.textContent = "4. 일반인 관리자 웹";
    			t13 = space();
    			li4 = element("li");
    			li4.textContent = "5. 회사내부 관리자 웹";
    			t15 = space();
    			div2 = element("div");
    			div2.textContent = "Skills that I used";
    			t17 = space();
    			ul1 = element("ul");
    			li5 = element("li");
    			li5.textContent = "HTML";
    			t19 = space();
    			li6 = element("li");
    			li6.textContent = "CSS";
    			t21 = space();
    			li7 = element("li");
    			li7.textContent = "JAVASCRIPT";
    			t23 = space();
    			li8 = element("li");
    			li8.textContent = "JQUERY";
    			t25 = space();
    			li9 = element("li");
    			li9.textContent = "PHP";
    			t27 = space();
    			li10 = element("li");
    			li10.textContent = "PUG";
    			t29 = space();
    			li11 = element("li");
    			li11.textContent = "LESS";
    			t31 = space();
    			li12 = element("li");
    			li12.textContent = "Node.js";
    			t33 = space();
    			div4 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Otheon";
    			attr_dev(div0, "class", "title svelte-cgppc1");
    			add_location(div0, file$3, 1, 4, 40);
    			attr_dev(h30, "class", "company_name svelte-cgppc1");
    			add_location(h30, file$3, 4, 12, 144);
    			attr_dev(div1, "class", "small_title svelte-cgppc1");
    			add_location(div1, file$3, 5, 12, 200);
    			attr_dev(li0, "class", "svelte-cgppc1");
    			add_location(li0, file$3, 7, 16, 296);
    			attr_dev(li1, "class", "svelte-cgppc1");
    			add_location(li1, file$3, 8, 16, 337);
    			attr_dev(li2, "class", "svelte-cgppc1");
    			add_location(li2, file$3, 9, 16, 378);
    			attr_dev(li3, "class", "svelte-cgppc1");
    			add_location(li3, file$3, 10, 16, 416);
    			attr_dev(li4, "class", "svelte-cgppc1");
    			add_location(li4, file$3, 11, 16, 455);
    			attr_dev(ul0, "class", "protect_list svelte-cgppc1");
    			add_location(ul0, file$3, 6, 12, 253);
    			attr_dev(div2, "class", "small_title svelte-cgppc1");
    			add_location(div2, file$3, 13, 12, 510);
    			attr_dev(li5, "class", "svelte-cgppc1");
    			add_location(li5, file$3, 15, 16, 614);
    			attr_dev(li6, "class", "svelte-cgppc1");
    			add_location(li6, file$3, 16, 16, 645);
    			attr_dev(li7, "class", "svelte-cgppc1");
    			add_location(li7, file$3, 17, 16, 675);
    			attr_dev(li8, "class", "svelte-cgppc1");
    			add_location(li8, file$3, 18, 16, 712);
    			attr_dev(li9, "class", "svelte-cgppc1");
    			add_location(li9, file$3, 19, 16, 745);
    			attr_dev(li10, "class", "svelte-cgppc1");
    			add_location(li10, file$3, 20, 16, 775);
    			attr_dev(li11, "class", "svelte-cgppc1");
    			add_location(li11, file$3, 21, 16, 805);
    			attr_dev(li12, "class", "svelte-cgppc1");
    			add_location(li12, file$3, 22, 16, 836);
    			attr_dev(ul1, "class", "skill_list svelte-cgppc1");
    			add_location(ul1, file$3, 14, 12, 573);
    			attr_dev(div3, "class", "left svelte-cgppc1");
    			add_location(div3, file$3, 3, 8, 112);
    			attr_dev(h31, "class", "company_name svelte-cgppc1");
    			add_location(h31, file$3, 26, 12, 937);
    			attr_dev(div4, "class", "right svelte-cgppc1");
    			add_location(div4, file$3, 25, 11, 904);
    			attr_dev(div5, "class", "flexbox svelte-cgppc1");
    			add_location(div5, file$3, 2, 4, 81);
    			attr_dev(div6, "id", "about");
    			attr_dev(div6, "class", "container svelte-cgppc1");
    			add_location(div6, file$3, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div0);
    			append_dev(div6, t1);
    			append_dev(div6, div5);
    			append_dev(div5, div3);
    			append_dev(div3, h30);
    			append_dev(div3, t3);
    			append_dev(div3, div1);
    			append_dev(div3, t5);
    			append_dev(div3, ul0);
    			append_dev(ul0, li0);
    			append_dev(ul0, t7);
    			append_dev(ul0, li1);
    			append_dev(ul0, t9);
    			append_dev(ul0, li2);
    			append_dev(ul0, t11);
    			append_dev(ul0, li3);
    			append_dev(ul0, t13);
    			append_dev(ul0, li4);
    			append_dev(div3, t15);
    			append_dev(div3, div2);
    			append_dev(div3, t17);
    			append_dev(div3, ul1);
    			append_dev(ul1, li5);
    			append_dev(ul1, t19);
    			append_dev(ul1, li6);
    			append_dev(ul1, t21);
    			append_dev(ul1, li7);
    			append_dev(ul1, t23);
    			append_dev(ul1, li8);
    			append_dev(ul1, t25);
    			append_dev(ul1, li9);
    			append_dev(ul1, t27);
    			append_dev(ul1, li10);
    			append_dev(ul1, t29);
    			append_dev(ul1, li11);
    			append_dev(ul1, t31);
    			append_dev(ul1, li12);
    			append_dev(div3, t33);
    			append_dev(div5, div4);
    			append_dev(div4, h31);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("About", $$slots, []);
    	return [];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.23.2 */
    const file$4 = "src\\App.svelte";

    function create_fragment$4(ctx) {
    	let main;
    	let navcomp;
    	let t0;
    	let top;
    	let t1;
    	let blog;
    	let t2;
    	let about;
    	let current;
    	navcomp = new Nav({ $$inline: true });
    	top = new Top({ $$inline: true });
    	blog = new Blog({ $$inline: true });
    	about = new About({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(navcomp.$$.fragment);
    			t0 = space();
    			create_component(top.$$.fragment);
    			t1 = space();
    			create_component(blog.$$.fragment);
    			t2 = space();
    			create_component(about.$$.fragment);
    			add_location(main, file$4, 7, 0, 162);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(navcomp, main, null);
    			append_dev(main, t0);
    			mount_component(top, main, null);
    			append_dev(main, t1);
    			mount_component(blog, main, null);
    			append_dev(main, t2);
    			mount_component(about, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navcomp.$$.fragment, local);
    			transition_in(top.$$.fragment, local);
    			transition_in(blog.$$.fragment, local);
    			transition_in(about.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navcomp.$$.fragment, local);
    			transition_out(top.$$.fragment, local);
    			transition_out(blog.$$.fragment, local);
    			transition_out(about.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(navcomp);
    			destroy_component(top);
    			destroy_component(blog);
    			destroy_component(about);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	$$self.$capture_state = () => ({ NavComp: Nav, Top, Blog, About });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
