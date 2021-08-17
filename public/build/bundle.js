
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
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
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }
    function compute_rest_props(props, keys) {
        const rest = {};
        keys = new Set(keys);
        for (const k in props)
            if (!keys.has(k) && k[0] !== '$')
                rest[k] = props[k];
        return rest;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    // Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    // at the end of hydration without touching the remaining nodes.
    let is_hydrating = false;
    function start_hydrating() {
        is_hydrating = true;
    }
    function end_hydrating() {
        is_hydrating = false;
    }
    function upper_bound(low, high, key, value) {
        // Return first index of value larger than input value in the range [low, high)
        while (low < high) {
            const mid = low + ((high - low) >> 1);
            if (key(mid) <= value) {
                low = mid + 1;
            }
            else {
                high = mid;
            }
        }
        return low;
    }
    function init_hydrate(target) {
        if (target.hydrate_init)
            return;
        target.hydrate_init = true;
        // We know that all children have claim_order values since the unclaimed have been detached
        const children = target.childNodes;
        /*
        * Reorder claimed children optimally.
        * We can reorder claimed children optimally by finding the longest subsequence of
        * nodes that are already claimed in order and only moving the rest. The longest
        * subsequence subsequence of nodes that are claimed in order can be found by
        * computing the longest increasing subsequence of .claim_order values.
        *
        * This algorithm is optimal in generating the least amount of reorder operations
        * possible.
        *
        * Proof:
        * We know that, given a set of reordering operations, the nodes that do not move
        * always form an increasing subsequence, since they do not move among each other
        * meaning that they must be already ordered among each other. Thus, the maximal
        * set of nodes that do not move form a longest increasing subsequence.
        */
        // Compute longest increasing subsequence
        // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
        const m = new Int32Array(children.length + 1);
        // Predecessor indices + 1
        const p = new Int32Array(children.length);
        m[0] = -1;
        let longest = 0;
        for (let i = 0; i < children.length; i++) {
            const current = children[i].claim_order;
            // Find the largest subsequence length such that it ends in a value less than our current value
            // upper_bound returns first greater value, so we subtract one
            const seqLen = upper_bound(1, longest + 1, idx => children[m[idx]].claim_order, current) - 1;
            p[i] = m[seqLen] + 1;
            const newLen = seqLen + 1;
            // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
            m[newLen] = i;
            longest = Math.max(newLen, longest);
        }
        // The longest increasing subsequence of nodes (initially reversed)
        const lis = [];
        // The rest of the nodes, nodes that will be moved
        const toMove = [];
        let last = children.length - 1;
        for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
            lis.push(children[cur - 1]);
            for (; last >= cur; last--) {
                toMove.push(children[last]);
            }
            last--;
        }
        for (; last >= 0; last--) {
            toMove.push(children[last]);
        }
        lis.reverse();
        // We sort the nodes being moved to guarantee that their insertion order matches the claim order
        toMove.sort((a, b) => a.claim_order - b.claim_order);
        // Finally, we move the nodes
        for (let i = 0, j = 0; i < toMove.length; i++) {
            while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
                j++;
            }
            const anchor = j < lis.length ? lis[j] : null;
            target.insertBefore(toMove[i], anchor);
        }
    }
    function append(target, node) {
        if (is_hydrating) {
            init_hydrate(target);
            if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentElement !== target))) {
                target.actual_end_child = target.firstChild;
            }
            if (node !== target.actual_end_child) {
                target.insertBefore(node, target.actual_end_child);
            }
            else {
                target.actual_end_child = node.nextSibling;
            }
        }
        else if (node.parentNode !== target) {
            target.appendChild(node);
        }
    }
    function insert(target, node, anchor) {
        if (is_hydrating && !anchor) {
            append(target, node);
        }
        else if (node.parentNode !== target || (anchor && node.nextSibling !== anchor)) {
            target.insertBefore(node, anchor || null);
        }
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
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
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        // @ts-ignore
        const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
        for (const key in attributes) {
            if (attributes[key] == null) {
                node.removeAttribute(key);
            }
            else if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key === '__value') {
                node.value = node[key] = attributes[key];
            }
            else if (descriptors[key] && descriptors[key].set) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
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
            set_current_component(null);
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

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program || pending_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
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
        }
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
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
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
                start_hydrating();
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
            mount_component(component, options.target, options.anchor, options.customElement);
            end_hydrating();
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
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
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const LOCATION = {};
    const ROUTER = {};

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    function getLocation(source) {
      return {
        ...source.location,
        state: source.history.state,
        key: (source.history.state && source.history.state.key) || "initial"
      };
    }

    function createHistory(source, options) {
      const listeners = [];
      let location = getLocation(source);

      return {
        get location() {
          return location;
        },

        listen(listener) {
          listeners.push(listener);

          const popstateListener = () => {
            location = getLocation(source);
            listener({ location, action: "POP" });
          };

          source.addEventListener("popstate", popstateListener);

          return () => {
            source.removeEventListener("popstate", popstateListener);

            const index = listeners.indexOf(listener);
            listeners.splice(index, 1);
          };
        },

        navigate(to, { state, replace = false } = {}) {
          state = { ...state, key: Date.now() + "" };
          // try...catch iOS Safari limits to 100 pushState calls
          try {
            if (replace) {
              source.history.replaceState(state, null, to);
            } else {
              source.history.pushState(state, null, to);
            }
          } catch (e) {
            source.location[replace ? "replace" : "assign"](to);
          }

          location = getLocation(source);
          listeners.forEach(listener => listener({ location, action: "PUSH" }));
        }
      };
    }

    // Stores history entries in memory for testing or other platforms like Native
    function createMemorySource(initialPathname = "/") {
      let index = 0;
      const stack = [{ pathname: initialPathname, search: "" }];
      const states = [];

      return {
        get location() {
          return stack[index];
        },
        addEventListener(name, fn) {},
        removeEventListener(name, fn) {},
        history: {
          get entries() {
            return stack;
          },
          get index() {
            return index;
          },
          get state() {
            return states[index];
          },
          pushState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            index++;
            stack.push({ pathname, search });
            states.push(state);
          },
          replaceState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            stack[index] = { pathname, search };
            states[index] = state;
          }
        }
      };
    }

    // Global history uses window.history as the source if available,
    // otherwise a memory history
    const canUseDOM = Boolean(
      typeof window !== "undefined" &&
        window.document &&
        window.document.createElement
    );
    const globalHistory = createHistory(canUseDOM ? window : createMemorySource());
    const { navigate } = globalHistory;

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    const paramRe = /^:(.+)/;

    const SEGMENT_POINTS = 4;
    const STATIC_POINTS = 3;
    const DYNAMIC_POINTS = 2;
    const SPLAT_PENALTY = 1;
    const ROOT_POINTS = 1;

    /**
     * Check if `string` starts with `search`
     * @param {string} string
     * @param {string} search
     * @return {boolean}
     */
    function startsWith(string, search) {
      return string.substr(0, search.length) === search;
    }

    /**
     * Check if `segment` is a root segment
     * @param {string} segment
     * @return {boolean}
     */
    function isRootSegment(segment) {
      return segment === "";
    }

    /**
     * Check if `segment` is a dynamic segment
     * @param {string} segment
     * @return {boolean}
     */
    function isDynamic(segment) {
      return paramRe.test(segment);
    }

    /**
     * Check if `segment` is a splat
     * @param {string} segment
     * @return {boolean}
     */
    function isSplat(segment) {
      return segment[0] === "*";
    }

    /**
     * Split up the URI into segments delimited by `/`
     * @param {string} uri
     * @return {string[]}
     */
    function segmentize(uri) {
      return (
        uri
          // Strip starting/ending `/`
          .replace(/(^\/+|\/+$)/g, "")
          .split("/")
      );
    }

    /**
     * Strip `str` of potential start and end `/`
     * @param {string} str
     * @return {string}
     */
    function stripSlashes(str) {
      return str.replace(/(^\/+|\/+$)/g, "");
    }

    /**
     * Score a route depending on how its individual segments look
     * @param {object} route
     * @param {number} index
     * @return {object}
     */
    function rankRoute(route, index) {
      const score = route.default
        ? 0
        : segmentize(route.path).reduce((score, segment) => {
            score += SEGMENT_POINTS;

            if (isRootSegment(segment)) {
              score += ROOT_POINTS;
            } else if (isDynamic(segment)) {
              score += DYNAMIC_POINTS;
            } else if (isSplat(segment)) {
              score -= SEGMENT_POINTS + SPLAT_PENALTY;
            } else {
              score += STATIC_POINTS;
            }

            return score;
          }, 0);

      return { route, score, index };
    }

    /**
     * Give a score to all routes and sort them on that
     * @param {object[]} routes
     * @return {object[]}
     */
    function rankRoutes(routes) {
      return (
        routes
          .map(rankRoute)
          // If two routes have the exact same score, we go by index instead
          .sort((a, b) =>
            a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
          )
      );
    }

    /**
     * Ranks and picks the best route to match. Each segment gets the highest
     * amount of points, then the type of segment gets an additional amount of
     * points where
     *
     *  static > dynamic > splat > root
     *
     * This way we don't have to worry about the order of our routes, let the
     * computers do it.
     *
     * A route looks like this
     *
     *  { path, default, value }
     *
     * And a returned match looks like:
     *
     *  { route, params, uri }
     *
     * @param {object[]} routes
     * @param {string} uri
     * @return {?object}
     */
    function pick(routes, uri) {
      let match;
      let default_;

      const [uriPathname] = uri.split("?");
      const uriSegments = segmentize(uriPathname);
      const isRootUri = uriSegments[0] === "";
      const ranked = rankRoutes(routes);

      for (let i = 0, l = ranked.length; i < l; i++) {
        const route = ranked[i].route;
        let missed = false;

        if (route.default) {
          default_ = {
            route,
            params: {},
            uri
          };
          continue;
        }

        const routeSegments = segmentize(route.path);
        const params = {};
        const max = Math.max(uriSegments.length, routeSegments.length);
        let index = 0;

        for (; index < max; index++) {
          const routeSegment = routeSegments[index];
          const uriSegment = uriSegments[index];

          if (routeSegment !== undefined && isSplat(routeSegment)) {
            // Hit a splat, just grab the rest, and return a match
            // uri:   /files/documents/work
            // route: /files/* or /files/*splatname
            const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

            params[splatName] = uriSegments
              .slice(index)
              .map(decodeURIComponent)
              .join("/");
            break;
          }

          if (uriSegment === undefined) {
            // URI is shorter than the route, no match
            // uri:   /users
            // route: /users/:userId
            missed = true;
            break;
          }

          let dynamicMatch = paramRe.exec(routeSegment);

          if (dynamicMatch && !isRootUri) {
            const value = decodeURIComponent(uriSegment);
            params[dynamicMatch[1]] = value;
          } else if (routeSegment !== uriSegment) {
            // Current segments don't match, not dynamic, not splat, so no match
            // uri:   /users/123/settings
            // route: /users/:id/profile
            missed = true;
            break;
          }
        }

        if (!missed) {
          match = {
            route,
            params,
            uri: "/" + uriSegments.slice(0, index).join("/")
          };
          break;
        }
      }

      return match || default_ || null;
    }

    /**
     * Check if the `path` matches the `uri`.
     * @param {string} path
     * @param {string} uri
     * @return {?object}
     */
    function match(route, uri) {
      return pick([route], uri);
    }

    /**
     * Add the query to the pathname if a query is given
     * @param {string} pathname
     * @param {string} [query]
     * @return {string}
     */
    function addQuery(pathname, query) {
      return pathname + (query ? `?${query}` : "");
    }

    /**
     * Resolve URIs as though every path is a directory, no files. Relative URIs
     * in the browser can feel awkward because not only can you be "in a directory",
     * you can be "at a file", too. For example:
     *
     *  browserSpecResolve('foo', '/bar/') => /bar/foo
     *  browserSpecResolve('foo', '/bar') => /foo
     *
     * But on the command line of a file system, it's not as complicated. You can't
     * `cd` from a file, only directories. This way, links have to know less about
     * their current path. To go deeper you can do this:
     *
     *  <Link to="deeper"/>
     *  // instead of
     *  <Link to=`{${props.uri}/deeper}`/>
     *
     * Just like `cd`, if you want to go deeper from the command line, you do this:
     *
     *  cd deeper
     *  # not
     *  cd $(pwd)/deeper
     *
     * By treating every path as a directory, linking to relative paths should
     * require less contextual information and (fingers crossed) be more intuitive.
     * @param {string} to
     * @param {string} base
     * @return {string}
     */
    function resolve(to, base) {
      // /foo/bar, /baz/qux => /foo/bar
      if (startsWith(to, "/")) {
        return to;
      }

      const [toPathname, toQuery] = to.split("?");
      const [basePathname] = base.split("?");
      const toSegments = segmentize(toPathname);
      const baseSegments = segmentize(basePathname);

      // ?a=b, /users?b=c => /users?a=b
      if (toSegments[0] === "") {
        return addQuery(basePathname, toQuery);
      }

      // profile, /users/789 => /users/789/profile
      if (!startsWith(toSegments[0], ".")) {
        const pathname = baseSegments.concat(toSegments).join("/");

        return addQuery((basePathname === "/" ? "" : "/") + pathname, toQuery);
      }

      // ./       , /users/123 => /users/123
      // ../      , /users/123 => /users
      // ../..    , /users/123 => /
      // ../../one, /a/b/c/d   => /a/b/one
      // .././one , /a/b/c/d   => /a/b/c/one
      const allSegments = baseSegments.concat(toSegments);
      const segments = [];

      allSegments.forEach(segment => {
        if (segment === "..") {
          segments.pop();
        } else if (segment !== ".") {
          segments.push(segment);
        }
      });

      return addQuery("/" + segments.join("/"), toQuery);
    }

    /**
     * Combines the `basepath` and the `path` into one path.
     * @param {string} basepath
     * @param {string} path
     */
    function combinePaths(basepath, path) {
      return `${stripSlashes(
    path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`
  )}/`;
    }

    /**
     * Decides whether a given `event` should result in a navigation or not.
     * @param {object} event
     */
    function shouldNavigate(event) {
      return (
        !event.defaultPrevented &&
        event.button === 0 &&
        !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey)
      );
    }

    /* node_modules/svelte-routing/src/Router.svelte generated by Svelte v3.38.3 */

    function create_fragment$c(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[9].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[8], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 256)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[8], !current ? -1 : dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	let $base;
    	let $location;
    	let $routes;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Router", slots, ['default']);
    	let { basepath = "/" } = $$props;
    	let { url = null } = $$props;
    	const locationContext = getContext(LOCATION);
    	const routerContext = getContext(ROUTER);
    	const routes = writable([]);
    	validate_store(routes, "routes");
    	component_subscribe($$self, routes, value => $$invalidate(7, $routes = value));
    	const activeRoute = writable(null);
    	let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

    	// If locationContext is not set, this is the topmost Router in the tree.
    	// If the `url` prop is given we force the location to it.
    	const location = locationContext || writable(url ? { pathname: url } : globalHistory.location);

    	validate_store(location, "location");
    	component_subscribe($$self, location, value => $$invalidate(6, $location = value));

    	// If routerContext is set, the routerBase of the parent Router
    	// will be the base for this Router's descendants.
    	// If routerContext is not set, the path and resolved uri will both
    	// have the value of the basepath prop.
    	const base = routerContext
    	? routerContext.routerBase
    	: writable({ path: basepath, uri: basepath });

    	validate_store(base, "base");
    	component_subscribe($$self, base, value => $$invalidate(5, $base = value));

    	const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
    		// If there is no activeRoute, the routerBase will be identical to the base.
    		if (activeRoute === null) {
    			return base;
    		}

    		const { path: basepath } = base;
    		const { route, uri } = activeRoute;

    		// Remove the potential /* or /*splatname from
    		// the end of the child Routes relative paths.
    		const path = route.default
    		? basepath
    		: route.path.replace(/\*.*$/, "");

    		return { path, uri };
    	});

    	function registerRoute(route) {
    		const { path: basepath } = $base;
    		let { path } = route;

    		// We store the original path in the _path property so we can reuse
    		// it when the basepath changes. The only thing that matters is that
    		// the route reference is intact, so mutation is fine.
    		route._path = path;

    		route.path = combinePaths(basepath, path);

    		if (typeof window === "undefined") {
    			// In SSR we should set the activeRoute immediately if it is a match.
    			// If there are more Routes being registered after a match is found,
    			// we just skip them.
    			if (hasActiveRoute) {
    				return;
    			}

    			const matchingRoute = match(route, $location.pathname);

    			if (matchingRoute) {
    				activeRoute.set(matchingRoute);
    				hasActiveRoute = true;
    			}
    		} else {
    			routes.update(rs => {
    				rs.push(route);
    				return rs;
    			});
    		}
    	}

    	function unregisterRoute(route) {
    		routes.update(rs => {
    			const index = rs.indexOf(route);
    			rs.splice(index, 1);
    			return rs;
    		});
    	}

    	if (!locationContext) {
    		// The topmost Router in the tree is responsible for updating
    		// the location store and supplying it through context.
    		onMount(() => {
    			const unlisten = globalHistory.listen(history => {
    				location.set(history.location);
    			});

    			return unlisten;
    		});

    		setContext(LOCATION, location);
    	}

    	setContext(ROUTER, {
    		activeRoute,
    		base,
    		routerBase,
    		registerRoute,
    		unregisterRoute
    	});

    	const writable_props = ["basepath", "url"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("basepath" in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ("url" in $$props) $$invalidate(4, url = $$props.url);
    		if ("$$scope" in $$props) $$invalidate(8, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		setContext,
    		onMount,
    		writable,
    		derived,
    		LOCATION,
    		ROUTER,
    		globalHistory,
    		pick,
    		match,
    		stripSlashes,
    		combinePaths,
    		basepath,
    		url,
    		locationContext,
    		routerContext,
    		routes,
    		activeRoute,
    		hasActiveRoute,
    		location,
    		base,
    		routerBase,
    		registerRoute,
    		unregisterRoute,
    		$base,
    		$location,
    		$routes
    	});

    	$$self.$inject_state = $$props => {
    		if ("basepath" in $$props) $$invalidate(3, basepath = $$props.basepath);
    		if ("url" in $$props) $$invalidate(4, url = $$props.url);
    		if ("hasActiveRoute" in $$props) hasActiveRoute = $$props.hasActiveRoute;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$base*/ 32) {
    			// This reactive statement will update all the Routes' path when
    			// the basepath changes.
    			{
    				const { path: basepath } = $base;

    				routes.update(rs => {
    					rs.forEach(r => r.path = combinePaths(basepath, r._path));
    					return rs;
    				});
    			}
    		}

    		if ($$self.$$.dirty & /*$routes, $location*/ 192) {
    			// This reactive statement will be run when the Router is created
    			// when there are no Routes and then again the following tick, so it
    			// will not find an active Route in SSR and in the browser it will only
    			// pick an active Route after all Routes have been registered.
    			{
    				const bestMatch = pick($routes, $location.pathname);
    				activeRoute.set(bestMatch);
    			}
    		}
    	};

    	return [
    		routes,
    		location,
    		base,
    		basepath,
    		url,
    		$base,
    		$location,
    		$routes,
    		$$scope,
    		slots
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, { basepath: 3, url: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$c.name
    		});
    	}

    	get basepath() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set basepath(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-routing/src/Route.svelte generated by Svelte v3.38.3 */

    const get_default_slot_changes = dirty => ({
    	params: dirty & /*routeParams*/ 4,
    	location: dirty & /*$location*/ 16
    });

    const get_default_slot_context = ctx => ({
    	params: /*routeParams*/ ctx[2],
    	location: /*$location*/ ctx[4]
    });

    // (40:0) {#if $activeRoute !== null && $activeRoute.route === route}
    function create_if_block$3(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1$2, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*component*/ ctx[0] !== null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(40:0) {#if $activeRoute !== null && $activeRoute.route === route}",
    		ctx
    	});

    	return block;
    }

    // (43:2) {:else}
    function create_else_block(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], get_default_slot_context);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, routeParams, $location*/ 532)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[9], !current ? -1 : dirty, get_default_slot_changes, get_default_slot_context);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(43:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (41:2) {#if component !== null}
    function create_if_block_1$2(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;

    	const switch_instance_spread_levels = [
    		{ location: /*$location*/ ctx[4] },
    		/*routeParams*/ ctx[2],
    		/*routeProps*/ ctx[3]
    	];

    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*$location, routeParams, routeProps*/ 28)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*$location*/ 16 && { location: /*$location*/ ctx[4] },
    					dirty & /*routeParams*/ 4 && get_spread_object(/*routeParams*/ ctx[2]),
    					dirty & /*routeProps*/ 8 && get_spread_object(/*routeProps*/ ctx[3])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(41:2) {#if component !== null}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$b(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$activeRoute*/ ctx[1] !== null && /*$activeRoute*/ ctx[1].route === /*route*/ ctx[7] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$activeRoute*/ ctx[1] !== null && /*$activeRoute*/ ctx[1].route === /*route*/ ctx[7]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*$activeRoute*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let $activeRoute;
    	let $location;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Route", slots, ['default']);
    	let { path = "" } = $$props;
    	let { component = null } = $$props;
    	const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER);
    	validate_store(activeRoute, "activeRoute");
    	component_subscribe($$self, activeRoute, value => $$invalidate(1, $activeRoute = value));
    	const location = getContext(LOCATION);
    	validate_store(location, "location");
    	component_subscribe($$self, location, value => $$invalidate(4, $location = value));

    	const route = {
    		path,
    		// If no path prop is given, this Route will act as the default Route
    		// that is rendered if no other Route in the Router is a match.
    		default: path === ""
    	};

    	let routeParams = {};
    	let routeProps = {};
    	registerRoute(route);

    	// There is no need to unregister Routes in SSR since it will all be
    	// thrown away anyway.
    	if (typeof window !== "undefined") {
    		onDestroy(() => {
    			unregisterRoute(route);
    		});
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(13, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("path" in $$new_props) $$invalidate(8, path = $$new_props.path);
    		if ("component" in $$new_props) $$invalidate(0, component = $$new_props.component);
    		if ("$$scope" in $$new_props) $$invalidate(9, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		onDestroy,
    		ROUTER,
    		LOCATION,
    		path,
    		component,
    		registerRoute,
    		unregisterRoute,
    		activeRoute,
    		location,
    		route,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location
    	});

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(13, $$props = assign(assign({}, $$props), $$new_props));
    		if ("path" in $$props) $$invalidate(8, path = $$new_props.path);
    		if ("component" in $$props) $$invalidate(0, component = $$new_props.component);
    		if ("routeParams" in $$props) $$invalidate(2, routeParams = $$new_props.routeParams);
    		if ("routeProps" in $$props) $$invalidate(3, routeProps = $$new_props.routeProps);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$activeRoute*/ 2) {
    			if ($activeRoute && $activeRoute.route === route) {
    				$$invalidate(2, routeParams = $activeRoute.params);
    			}
    		}

    		{
    			const { path, component, ...rest } = $$props;
    			$$invalidate(3, routeProps = rest);
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		component,
    		$activeRoute,
    		routeParams,
    		routeProps,
    		$location,
    		activeRoute,
    		location,
    		route,
    		path,
    		$$scope,
    		slots
    	];
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, { path: 8, component: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Route",
    			options,
    			id: create_fragment$b.name
    		});
    	}

    	get path() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-routing/src/Link.svelte generated by Svelte v3.38.3 */
    const file$9 = "node_modules/svelte-routing/src/Link.svelte";

    function create_fragment$a(ctx) {
    	let a;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[16].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[15], null);

    	let a_levels = [
    		{ href: /*href*/ ctx[0] },
    		{ "aria-current": /*ariaCurrent*/ ctx[2] },
    		/*props*/ ctx[1],
    		/*$$restProps*/ ctx[6]
    	];

    	let a_data = {};

    	for (let i = 0; i < a_levels.length; i += 1) {
    		a_data = assign(a_data, a_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			a = element("a");
    			if (default_slot) default_slot.c();
    			set_attributes(a, a_data);
    			add_location(a, file$9, 40, 0, 1249);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(a, "click", /*onClick*/ ctx[5], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 32768)) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[15], !current ? -1 : dirty, null, null);
    				}
    			}

    			set_attributes(a, a_data = get_spread_update(a_levels, [
    				(!current || dirty & /*href*/ 1) && { href: /*href*/ ctx[0] },
    				(!current || dirty & /*ariaCurrent*/ 4) && { "aria-current": /*ariaCurrent*/ ctx[2] },
    				dirty & /*props*/ 2 && /*props*/ ctx[1],
    				dirty & /*$$restProps*/ 64 && /*$$restProps*/ ctx[6]
    			]));
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (default_slot) default_slot.d(detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let ariaCurrent;
    	const omit_props_names = ["to","replace","state","getProps"];
    	let $$restProps = compute_rest_props($$props, omit_props_names);
    	let $base;
    	let $location;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Link", slots, ['default']);
    	let { to = "#" } = $$props;
    	let { replace = false } = $$props;
    	let { state = {} } = $$props;
    	let { getProps = () => ({}) } = $$props;
    	const { base } = getContext(ROUTER);
    	validate_store(base, "base");
    	component_subscribe($$self, base, value => $$invalidate(13, $base = value));
    	const location = getContext(LOCATION);
    	validate_store(location, "location");
    	component_subscribe($$self, location, value => $$invalidate(14, $location = value));
    	const dispatch = createEventDispatcher();
    	let href, isPartiallyCurrent, isCurrent, props;

    	function onClick(event) {
    		dispatch("click", event);

    		if (shouldNavigate(event)) {
    			event.preventDefault();

    			// Don't push another entry to the history stack when the user
    			// clicks on a Link to the page they are currently on.
    			const shouldReplace = $location.pathname === href || replace;

    			navigate(href, { state, replace: shouldReplace });
    		}
    	}

    	$$self.$$set = $$new_props => {
    		$$props = assign(assign({}, $$props), exclude_internal_props($$new_props));
    		$$invalidate(6, $$restProps = compute_rest_props($$props, omit_props_names));
    		if ("to" in $$new_props) $$invalidate(7, to = $$new_props.to);
    		if ("replace" in $$new_props) $$invalidate(8, replace = $$new_props.replace);
    		if ("state" in $$new_props) $$invalidate(9, state = $$new_props.state);
    		if ("getProps" in $$new_props) $$invalidate(10, getProps = $$new_props.getProps);
    		if ("$$scope" in $$new_props) $$invalidate(15, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		getContext,
    		createEventDispatcher,
    		ROUTER,
    		LOCATION,
    		navigate,
    		startsWith,
    		resolve,
    		shouldNavigate,
    		to,
    		replace,
    		state,
    		getProps,
    		base,
    		location,
    		dispatch,
    		href,
    		isPartiallyCurrent,
    		isCurrent,
    		props,
    		onClick,
    		$base,
    		$location,
    		ariaCurrent
    	});

    	$$self.$inject_state = $$new_props => {
    		if ("to" in $$props) $$invalidate(7, to = $$new_props.to);
    		if ("replace" in $$props) $$invalidate(8, replace = $$new_props.replace);
    		if ("state" in $$props) $$invalidate(9, state = $$new_props.state);
    		if ("getProps" in $$props) $$invalidate(10, getProps = $$new_props.getProps);
    		if ("href" in $$props) $$invalidate(0, href = $$new_props.href);
    		if ("isPartiallyCurrent" in $$props) $$invalidate(11, isPartiallyCurrent = $$new_props.isPartiallyCurrent);
    		if ("isCurrent" in $$props) $$invalidate(12, isCurrent = $$new_props.isCurrent);
    		if ("props" in $$props) $$invalidate(1, props = $$new_props.props);
    		if ("ariaCurrent" in $$props) $$invalidate(2, ariaCurrent = $$new_props.ariaCurrent);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*to, $base*/ 8320) {
    			$$invalidate(0, href = to === "/" ? $base.uri : resolve(to, $base.uri));
    		}

    		if ($$self.$$.dirty & /*$location, href*/ 16385) {
    			$$invalidate(11, isPartiallyCurrent = startsWith($location.pathname, href));
    		}

    		if ($$self.$$.dirty & /*href, $location*/ 16385) {
    			$$invalidate(12, isCurrent = href === $location.pathname);
    		}

    		if ($$self.$$.dirty & /*isCurrent*/ 4096) {
    			$$invalidate(2, ariaCurrent = isCurrent ? "page" : undefined);
    		}

    		if ($$self.$$.dirty & /*getProps, $location, href, isPartiallyCurrent, isCurrent*/ 23553) {
    			$$invalidate(1, props = getProps({
    				location: $location,
    				href,
    				isPartiallyCurrent,
    				isCurrent
    			}));
    		}
    	};

    	return [
    		href,
    		props,
    		ariaCurrent,
    		base,
    		location,
    		onClick,
    		$$restProps,
    		to,
    		replace,
    		state,
    		getProps,
    		isPartiallyCurrent,
    		isCurrent,
    		$base,
    		$location,
    		$$scope,
    		slots
    	];
    }

    class Link extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {
    			to: 7,
    			replace: 8,
    			state: 9,
    			getProps: 10
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Link",
    			options,
    			id: create_fragment$a.name
    		});
    	}

    	get to() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set to(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get replace() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set replace(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get state() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set state(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get getProps() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set getProps(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function circIn(t) {
        return 1.0 - Math.sqrt(1.0 - t * t);
    }
    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }
    function slide(node, { delay = 0, duration = 400, easing = cubicOut } = {}) {
        const style = getComputedStyle(node);
        const opacity = +style.opacity;
        const height = parseFloat(style.height);
        const padding_top = parseFloat(style.paddingTop);
        const padding_bottom = parseFloat(style.paddingBottom);
        const margin_top = parseFloat(style.marginTop);
        const margin_bottom = parseFloat(style.marginBottom);
        const border_top_width = parseFloat(style.borderTopWidth);
        const border_bottom_width = parseFloat(style.borderBottomWidth);
        return {
            delay,
            duration,
            easing,
            css: t => 'overflow: hidden;' +
                `opacity: ${Math.min(t * 20, 1) * opacity};` +
                `height: ${t * height}px;` +
                `padding-top: ${t * padding_top}px;` +
                `padding-bottom: ${t * padding_bottom}px;` +
                `margin-top: ${t * margin_top}px;` +
                `margin-bottom: ${t * margin_bottom}px;` +
                `border-top-width: ${t * border_top_width}px;` +
                `border-bottom-width: ${t * border_bottom_width}px;`
        };
    }
    function scale(node, { delay = 0, duration = 400, easing = cubicOut, start = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const sd = 1 - start;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (_t, u) => `
			transform: ${transform} scale(${1 - (sd * u)});
			opacity: ${target_opacity - (od * u)}
		`
        };
    }

    /* src/pages/about.svelte generated by Svelte v3.38.3 */
    const file$8 = "src/pages/about.svelte";

    function create_fragment$9(ctx) {
    	let t0;
    	let div;
    	let div_transition;
    	let current;

    	const block = {
    		c: function create() {
    			t0 = space();
    			div = element("div");
    			div.textContent = "about us";
    			document.title = "\n        درباره ما\n    ";
    			add_location(div, file$8, 13, 0, 336);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, scale, {}, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div_transition) div_transition = create_bidirectional_transition(div, scale, {}, false);
    			div_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("About", slots, []);
    	var currentLocation = window.location.href;
    	var splitUrl = currentLocation.split("/");
    	var lastSugment = splitUrl[splitUrl.length - 1];
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		fade,
    		slide,
    		scale,
    		currentLocation,
    		splitUrl,
    		lastSugment
    	});

    	$$self.$inject_state = $$props => {
    		if ("currentLocation" in $$props) currentLocation = $$props.currentLocation;
    		if ("splitUrl" in $$props) splitUrl = $$props.splitUrl;
    		if ("lastSugment" in $$props) lastSugment = $$props.lastSugment;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/pages/contact.svelte generated by Svelte v3.38.3 */

    function create_fragment$8(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("\ncontact us");
    			document.title = "\n        تماس باما\n    ";
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Contact", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Contact> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Contact extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Contact",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    // do not edit .js files directly - edit src/index.jst



    var fastDeepEqual = function equal(a, b) {
      if (a === b) return true;

      if (a && b && typeof a == 'object' && typeof b == 'object') {
        if (a.constructor !== b.constructor) return false;

        var length, i, keys;
        if (Array.isArray(a)) {
          length = a.length;
          if (length != b.length) return false;
          for (i = length; i-- !== 0;)
            if (!equal(a[i], b[i])) return false;
          return true;
        }



        if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
        if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
        if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();

        keys = Object.keys(a);
        length = keys.length;
        if (length !== Object.keys(b).length) return false;

        for (i = length; i-- !== 0;)
          if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;

        for (i = length; i-- !== 0;) {
          var key = keys[i];

          if (!equal(a[key], b[key])) return false;
        }

        return true;
      }

      // true if both NaN, false otherwise
      return a!==a && b!==b;
    };

    /**
     * Copyright 2019 Google LLC. All Rights Reserved.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at.
     *
     *      Http://www.apache.org/licenses/LICENSE-2.0.
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     */
    const DEFAULT_ID = "__googleMapsScriptId";
    /**
     * [[Loader]] makes it easier to add Google Maps JavaScript API to your application
     * dynamically using
     * [Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).
     * It works by dynamically creating and appending a script node to the the
     * document head and wrapping the callback function so as to return a promise.
     *
     * ```
     * const loader = new Loader({
     *   apiKey: "",
     *   version: "weekly",
     *   libraries: ["places"]
     * });
     *
     * loader.load().then((google) => {
     *   const map = new google.maps.Map(...)
     * })
     * ```
     */
    class Loader {
        /**
         * Creates an instance of Loader using [[LoaderOptions]]. No defaults are set
         * using this library, instead the defaults are set by the Google Maps
         * JavaScript API server.
         *
         * ```
         * const loader = Loader({apiKey, version: 'weekly', libraries: ['places']});
         * ```
         */
        constructor({ apiKey, channel, client, id = DEFAULT_ID, libraries = [], language, region, version, mapIds, nonce, retries = 3, url = "https://maps.googleapis.com/maps/api/js", }) {
            this.CALLBACK = "__googleMapsCallback";
            this.callbacks = [];
            this.done = false;
            this.loading = false;
            this.errors = [];
            this.version = version;
            this.apiKey = apiKey;
            this.channel = channel;
            this.client = client;
            this.id = id || DEFAULT_ID; // Do not allow empty string
            this.libraries = libraries;
            this.language = language;
            this.region = region;
            this.mapIds = mapIds;
            this.nonce = nonce;
            this.retries = retries;
            this.url = url;
            if (Loader.instance) {
                if (!fastDeepEqual(this.options, Loader.instance.options)) {
                    throw new Error(`Loader must not be called again with different options. ${JSON.stringify(this.options)} !== ${JSON.stringify(Loader.instance.options)}`);
                }
                return Loader.instance;
            }
            Loader.instance = this;
        }
        get options() {
            return {
                version: this.version,
                apiKey: this.apiKey,
                channel: this.channel,
                client: this.client,
                id: this.id,
                libraries: this.libraries,
                language: this.language,
                region: this.region,
                mapIds: this.mapIds,
                nonce: this.nonce,
                url: this.url,
            };
        }
        get failed() {
            return this.done && !this.loading && this.errors.length >= this.retries + 1;
        }
        /**
         * CreateUrl returns the Google Maps JavaScript API script url given the [[LoaderOptions]].
         *
         * @ignore
         */
        createUrl() {
            let url = this.url;
            url += `?callback=${this.CALLBACK}`;
            if (this.apiKey) {
                url += `&key=${this.apiKey}`;
            }
            if (this.channel) {
                url += `&channel=${this.channel}`;
            }
            if (this.client) {
                url += `&client=${this.client}`;
            }
            if (this.libraries.length > 0) {
                url += `&libraries=${this.libraries.join(",")}`;
            }
            if (this.language) {
                url += `&language=${this.language}`;
            }
            if (this.region) {
                url += `&region=${this.region}`;
            }
            if (this.version) {
                url += `&v=${this.version}`;
            }
            if (this.mapIds) {
                url += `&map_ids=${this.mapIds.join(",")}`;
            }
            return url;
        }
        /**
         * Load the Google Maps JavaScript API script and return a Promise.
         */
        load() {
            return this.loadPromise();
        }
        /**
         * Load the Google Maps JavaScript API script and return a Promise.
         *
         * @ignore
         */
        loadPromise() {
            return new Promise((resolve, reject) => {
                this.loadCallback((err) => {
                    if (!err) {
                        resolve(window.google);
                    }
                    else {
                        reject(err);
                    }
                });
            });
        }
        /**
         * Load the Google Maps JavaScript API script with a callback.
         */
        loadCallback(fn) {
            this.callbacks.push(fn);
            this.execute();
        }
        /**
         * Set the script on document.
         */
        setScript() {
            if (document.getElementById(this.id)) {
                // TODO wrap onerror callback for cases where the script was loaded elsewhere
                this.callback();
                return;
            }
            const url = this.createUrl();
            const script = document.createElement("script");
            script.id = this.id;
            script.type = "text/javascript";
            script.src = url;
            script.onerror = this.loadErrorCallback.bind(this);
            script.defer = true;
            script.async = true;
            if (this.nonce) {
                script.nonce = this.nonce;
            }
            document.head.appendChild(script);
        }
        deleteScript() {
            const script = document.getElementById(this.id);
            if (script) {
                script.remove();
            }
        }
        /**
         * Reset the loader state.
         */
        reset() {
            this.deleteScript();
            this.done = false;
            this.loading = false;
            this.errors = [];
            this.onerrorEvent = null;
        }
        resetIfRetryingFailed() {
            if (this.failed) {
                this.reset();
            }
        }
        loadErrorCallback(e) {
            this.errors.push(e);
            if (this.errors.length <= this.retries) {
                const delay = this.errors.length * Math.pow(2, this.errors.length);
                console.log(`Failed to load Google Maps script, retrying in ${delay} ms.`);
                setTimeout(() => {
                    this.deleteScript();
                    this.setScript();
                }, delay);
            }
            else {
                this.onerrorEvent = e;
                this.callback();
            }
        }
        setCallback() {
            window.__googleMapsCallback = this.callback.bind(this);
        }
        callback() {
            this.done = true;
            this.loading = false;
            this.callbacks.forEach((cb) => {
                cb(this.onerrorEvent);
            });
            this.callbacks = [];
        }
        execute() {
            this.resetIfRetryingFailed();
            if (this.done) {
                this.callback();
            }
            else {
                // short circuit and warn if google.maps is already loaded
                if (window.google && window.google.maps && window.google.maps.version) {
                    console.warn("Google Maps already loaded outside @googlemaps/js-api-loader." +
                        "This may result in undesirable behavior as options and script parameters may not match.");
                    this.callback();
                    return;
                }
                if (this.loading) ;
                else {
                    this.loading = true;
                    this.setCallback();
                    this.setScript();
                }
            }
        }
    }

    /* src/pages/show-detail.svelte generated by Svelte v3.38.3 */

    const { console: console_1$3, window: window_1$3 } = globals;
    const file$7 = "src/pages/show-detail.svelte";

    function create_fragment$7(ctx) {
    	let scrolling = false;

    	let clear_scrolling = () => {
    		scrolling = false;
    	};

    	let scrolling_timeout;
    	let t0;
    	let main;
    	let div20;
    	let aside0;
    	let div3;
    	let div2;
    	let div1;
    	let div0;
    	let a0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let aside3;
    	let div19;
    	let aside1;
    	let section;
    	let div17;
    	let article;
    	let div11;
    	let div10;
    	let div8;
    	let div7;
    	let div4;
    	let img1;
    	let img1_src_value;
    	let t2;
    	let div6;
    	let div5;
    	let h6;
    	let a1;
    	let t3;
    	let i0;
    	let t4;
    	let span0;
    	let i1;
    	let t5;
    	let t6;
    	let div9;
    	let i2;
    	let t7;
    	let ul;
    	let li0;
    	let a2;
    	let i3;
    	let t8;
    	let t9;
    	let li1;
    	let a3;
    	let i4;
    	let t10;
    	let t11;
    	let li2;
    	let a4;
    	let i5;
    	let t12;
    	let t13;
    	let div12;
    	let h3;
    	let a5;
    	let t15;
    	let div13;
    	let img2;
    	let img2_src_value;
    	let t16;
    	let p;
    	let t18;
    	let div14;
    	let a6;
    	let button;
    	let t20;
    	let div16;
    	let a7;
    	let img3;
    	let img3_src_value;
    	let t21;
    	let span1;
    	let t23;
    	let t24;
    	let div15;
    	let i6;
    	let t25;
    	let t26;
    	let aside2;
    	let div18;
    	let t28;
    	let br0;
    	let br1;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowscroll*/ ctx[2]);

    	const block = {
    		c: function create() {
    			t0 = space();
    			main = element("main");
    			div20 = element("div");
    			aside0 = element("aside");
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			a0 = element("a");
    			img0 = element("img");
    			t1 = space();
    			aside3 = element("aside");
    			div19 = element("div");
    			aside1 = element("aside");
    			section = element("section");
    			div17 = element("div");
    			article = element("article");
    			div11 = element("div");
    			div10 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			div4 = element("div");
    			img1 = element("img");
    			t2 = space();
    			div6 = element("div");
    			div5 = element("div");
    			h6 = element("h6");
    			a1 = element("a");
    			t3 = text("مرکز رشد و نواوری آفرینه ");
    			i0 = element("i");
    			t4 = space();
    			span0 = element("span");
    			i1 = element("i");
    			t5 = text(" ۳ دقیقه قبل");
    			t6 = space();
    			div9 = element("div");
    			i2 = element("i");
    			t7 = space();
    			ul = element("ul");
    			li0 = element("li");
    			a2 = element("a");
    			i3 = element("i");
    			t8 = text(" ذخیره کردن پست");
    			t9 = space();
    			li1 = element("li");
    			a3 = element("a");
    			i4 = element("i");
    			t10 = text(" کپی کردن لینک");
    			t11 = space();
    			li2 = element("li");
    			a4 = element("a");
    			i5 = element("i");
    			t12 = text(" گزارش دادن");
    			t13 = space();
    			div12 = element("div");
    			h3 = element("h3");
    			a5 = element("a");
    			a5.textContent = "به اینولینکس خوش آمدید";
    			t15 = space();
    			div13 = element("div");
    			img2 = element("img");
    			t16 = space();
    			p = element("p");
    			p.textContent = "طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.\n                                   \n                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.\n                                   \n                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.\n                                   \n                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.\n                                   \n                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.\n                                   \n                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.\n                                   \n                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.\n                                   \n                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.\n                                   \n                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.\n                                   \n                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.";
    			t18 = space();
    			div14 = element("div");
    			a6 = element("a");
    			button = element("button");
    			button.textContent = "ادامه مطلب";
    			t20 = space();
    			div16 = element("div");
    			a7 = element("a");
    			img3 = element("img");
    			t21 = space();
    			span1 = element("span");
    			span1.textContent = "مسعودآقایی ساداتی";
    			t23 = text("  ");
    			t24 = space();
    			div15 = element("div");
    			i6 = element("i");
    			t25 = text(" ۵۶");
    			t26 = space();
    			aside2 = element("aside");
    			div18 = element("div");
    			div18.textContent = "hello";
    			t28 = space();
    			br0 = element("br");
    			br1 = element("br");
    			document.title = "\n       جزییات مقاله\n    ";
    			attr_dev(img0, "class", "w-100 dream-job-image");
    			if (img0.src !== (img0_src_value = "../image/job.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$7, 42, 32, 1340);
    			attr_dev(a0, "href", "#");
    			add_location(a0, file$7, 41, 28, 1295);
    			attr_dev(div0, "class", "col-12 my-1");
    			add_location(div0, file$7, 40, 24, 1241);
    			attr_dev(div1, "class", "row ");
    			add_location(div1, file$7, 39, 20, 1198);
    			attr_dev(div2, "class", "col-12 shadow-radius-section bg-light");
    			add_location(div2, file$7, 38, 16, 1126);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file$7, 37, 12, 1092);
    			attr_dev(aside0, "class", "col-12 col-md-3 mr-2 d-none d-md-inline");
    			add_location(aside0, file$7, 36, 8, 1023);
    			attr_dev(img1, "class", "cu-image-com mr-1 ");
    			if (img1.src !== (img1_src_value = "../image/afarine.jpg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$7, 60, 52, 2429);
    			attr_dev(div4, "class", "col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width");
    			add_location(div4, file$7, 59, 48, 2307);
    			set_style(i0, "color", "#048af7");
    			attr_dev(i0, "class", "fas fa-check-circle");
    			add_location(i0, file$7, 64, 133, 2935);
    			attr_dev(a1, "href", "magezine");
    			attr_dev(a1, "class", "title-post-link");
    			add_location(a1, file$7, 64, 60, 2862);
    			add_location(h6, file$7, 64, 56, 2858);
    			attr_dev(i1, "class", "fas fa-clock");
    			add_location(i1, file$7, 65, 88, 3091);
    			attr_dev(span0, "class", "show-time-custome");
    			add_location(span0, file$7, 65, 56, 3059);
    			attr_dev(div5, "class", "cu-intro mt-2");
    			add_location(div5, file$7, 63, 52, 2774);
    			attr_dev(div6, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-0 pr-md-4 mr-lg-2 mr-xl-0 pr-xl-3 justify-content-center custome-margin-right ");
    			add_location(div6, file$7, 62, 48, 2599);
    			attr_dev(div7, "class", "row ");
    			add_location(div7, file$7, 58, 44, 2240);
    			attr_dev(div8, "class", "col-11 col-md-11");
    			add_location(div8, file$7, 57, 40, 2164);
    			attr_dev(i2, "class", "fas fa-ellipsis-h -1 ");
    			attr_dev(i2, "type", "button");
    			attr_dev(i2, "data-toggle", "dropdown");
    			add_location(i2, file$7, 72, 44, 3558);
    			attr_dev(i3, "class", "far fa-bookmark");
    			add_location(i3, file$7, 74, 128, 3846);
    			attr_dev(a2, "class", "dropdown-item");
    			attr_dev(a2, "href", "#");
    			add_location(a2, file$7, 74, 93, 3811);
    			add_location(li0, file$7, 74, 48, 3766);
    			attr_dev(i4, "class", "fas fa-share-alt");
    			add_location(i4, file$7, 75, 86, 3989);
    			attr_dev(a3, "class", "dropdown-item");
    			attr_dev(a3, "href", "#");
    			add_location(a3, file$7, 75, 52, 3955);
    			add_location(li1, file$7, 75, 48, 3951);
    			attr_dev(i5, "class", "fas fa-flag");
    			add_location(i5, file$7, 76, 86, 4132);
    			attr_dev(a4, "class", "dropdown-item");
    			attr_dev(a4, "href", "#");
    			add_location(a4, file$7, 76, 52, 4098);
    			add_location(li2, file$7, 76, 48, 4094);
    			attr_dev(ul, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul, file$7, 73, 44, 3677);
    			attr_dev(div9, "class", "report col-1 ml-0 pl-0 pr-3 navbar pr-sm-4 pr-md-3 pr-lg-3 pr-xl-4 ");
    			add_location(div9, file$7, 71, 40, 3432);
    			attr_dev(div10, "class", "row justify-content-between p-2 pl-4 pl-md-2");
    			add_location(div10, file$7, 56, 36, 2065);
    			attr_dev(div11, "class", "col-12");
    			add_location(div11, file$7, 55, 32, 2008);
    			attr_dev(a5, "class", "title-post-link");
    			attr_dev(a5, "href", "#");
    			add_location(a5, file$7, 83, 80, 4529);
    			attr_dev(h3, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h3, file$7, 83, 36, 4485);
    			attr_dev(div12, "class", "col-12 p-0");
    			add_location(div12, file$7, 82, 32, 4424);
    			if (img2.src !== (img2_src_value = "../image/30.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$7, 86, 36, 4762);
    			attr_dev(div13, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div13, file$7, 85, 32, 4668);
    			attr_dev(p, "class", "col-12 mt-3 post-text");
    			add_location(p, file$7, 89, 32, 4952);
    			attr_dev(button, "id", "read-more");
    			attr_dev(button, "class", "btn btn-sm btn-danger col-12 col-md-2 my-1 p-1 offset-0 offset-md-10");
    			add_location(button, file$7, 183, 40, 15076);
    			attr_dev(a6, "href", "#");
    			add_location(a6, file$7, 182, 36, 15023);
    			attr_dev(div14, "class", "col-12 ");
    			add_location(div14, file$7, 181, 32, 14965);
    			attr_dev(img3, "class", "personal-img");
    			if (img3.src !== (img3_src_value = "../image/1.jpeg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "");
    			add_location(img3, file$7, 189, 40, 15495);
    			attr_dev(span1, "class", "personal-name");
    			add_location(span1, file$7, 190, 40, 15591);
    			attr_dev(a7, "class", "a-clicked");
    			attr_dev(a7, "href", "#");
    			add_location(a7, file$7, 188, 36, 15424);
    			attr_dev(i6, "class", "fas fa-eye");
    			add_location(i6, file$7, 192, 60, 15758);
    			attr_dev(div15, "class", "view-count");
    			add_location(div15, file$7, 192, 36, 15734);
    			attr_dev(div16, "class", "col-12 mb-1 author-show-box pt-1");
    			add_location(div16, file$7, 187, 32, 15341);
    			attr_dev(article, "class", "p-0  shadow-radius-section shadow-section mb-4 bg-light");
    			add_location(article, file$7, 54, 28, 1902);
    			attr_dev(div17, "class", "col-12 p-0 main-article ");
    			add_location(div17, file$7, 53, 24, 1835);
    			attr_dev(section, "class", "row mx-0 mt-1 mr-0 pt-0  ");
    			add_location(section, file$7, 52, 20, 1767);
    			attr_dev(aside1, "class", "col-12 col-md-9 order-first justify-content-between order-md-0 mx-0 ");
    			add_location(aside1, file$7, 51, 16, 1662);
    			attr_dev(div18, "class", "row px-0 text-center shadow-radius-section bg-light ");
    			add_location(div18, file$7, 199, 20, 16052);
    			attr_dev(aside2, "class", "mt-1 col-12 col-md-3 d-none d-md-inline");
    			add_location(aside2, file$7, 198, 16, 15975);
    			attr_dev(div19, "class", "row px-0 mx-0");
    			add_location(div19, file$7, 50, 12, 1617);
    			attr_dev(aside3, "class", "col-12 col-md-8  px-0");
    			add_location(aside3, file$7, 49, 8, 1564);
    			attr_dev(div20, "class", "row justify-content-center mx-0");
    			add_location(div20, file$7, 34, 4, 960);
    			attr_dev(main, "class", "container-fluid pin-parent px-0");
    			add_location(main, file$7, 33, 0, 909);
    			add_location(br0, file$7, 207, 0, 16256);
    			add_location(br1, file$7, 207, 4, 16260);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div20);
    			append_dev(div20, aside0);
    			append_dev(aside0, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, a0);
    			append_dev(a0, img0);
    			append_dev(div20, t1);
    			append_dev(div20, aside3);
    			append_dev(aside3, div19);
    			append_dev(div19, aside1);
    			append_dev(aside1, section);
    			append_dev(section, div17);
    			append_dev(div17, article);
    			append_dev(article, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div4);
    			append_dev(div4, img1);
    			append_dev(div7, t2);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, h6);
    			append_dev(h6, a1);
    			append_dev(a1, t3);
    			append_dev(a1, i0);
    			append_dev(div5, t4);
    			append_dev(div5, span0);
    			append_dev(span0, i1);
    			append_dev(span0, t5);
    			append_dev(div10, t6);
    			append_dev(div10, div9);
    			append_dev(div9, i2);
    			append_dev(div9, t7);
    			append_dev(div9, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a2);
    			append_dev(a2, i3);
    			append_dev(a2, t8);
    			append_dev(ul, t9);
    			append_dev(ul, li1);
    			append_dev(li1, a3);
    			append_dev(a3, i4);
    			append_dev(a3, t10);
    			append_dev(ul, t11);
    			append_dev(ul, li2);
    			append_dev(li2, a4);
    			append_dev(a4, i5);
    			append_dev(a4, t12);
    			append_dev(article, t13);
    			append_dev(article, div12);
    			append_dev(div12, h3);
    			append_dev(h3, a5);
    			append_dev(article, t15);
    			append_dev(article, div13);
    			append_dev(div13, img2);
    			append_dev(article, t16);
    			append_dev(article, p);
    			append_dev(article, t18);
    			append_dev(article, div14);
    			append_dev(div14, a6);
    			append_dev(a6, button);
    			append_dev(article, t20);
    			append_dev(article, div16);
    			append_dev(div16, a7);
    			append_dev(a7, img3);
    			append_dev(a7, t21);
    			append_dev(a7, span1);
    			append_dev(a7, t23);
    			append_dev(div16, t24);
    			append_dev(div16, div15);
    			append_dev(div15, i6);
    			append_dev(div15, t25);
    			append_dev(div19, t26);
    			append_dev(div19, aside2);
    			append_dev(aside2, div18);
    			insert_dev(target, t28, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, br1, anchor);

    			if (!mounted) {
    				dispose = listen_dev(window_1$3, "scroll", () => {
    					scrolling = true;
    					clearTimeout(scrolling_timeout);
    					scrolling_timeout = setTimeout(clear_scrolling, 100);
    					/*onwindowscroll*/ ctx[2]();
    				});

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*y*/ 1 && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window_1$3.pageXOffset, /*y*/ ctx[0]);
    				scrolling_timeout = setTimeout(clear_scrolling, 100);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			if (detaching) detach_dev(t28);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(br1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Show_detail", slots, []);
    	let { url = "" } = $$props;
    	let { y } = $$props;
    	const urlParams = new URLSearchParams(window.location.search);
    	const id = urlParams.has("id");
    	console.log(id);
    	let isOpen = false;

    	function toggleNav() {
    		isOpen = !isOpen;
    	}

    	//let y=0;
    	var currentLocation = window.location.href;

    	var splitUrl = currentLocation.split("/");
    	var lastSugment = splitUrl[splitUrl.length - 1];

    	// $ : console.log(lastSugment);
    	let map;

    	const writable_props = ["url", "y"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$3.warn(`<Show_detail> was created with unknown prop '${key}'`);
    	});

    	function onwindowscroll() {
    		$$invalidate(0, y = window_1$3.pageYOffset);
    	}

    	$$self.$$set = $$props => {
    		if ("url" in $$props) $$invalidate(1, url = $$props.url);
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		fade,
    		slide,
    		scale,
    		fly,
    		Loader,
    		Router,
    		Link,
    		Route,
    		circIn,
    		url,
    		y,
    		urlParams,
    		id,
    		isOpen,
    		toggleNav,
    		currentLocation,
    		splitUrl,
    		lastSugment,
    		map
    	});

    	$$self.$inject_state = $$props => {
    		if ("url" in $$props) $$invalidate(1, url = $$props.url);
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    		if ("isOpen" in $$props) isOpen = $$props.isOpen;
    		if ("currentLocation" in $$props) currentLocation = $$props.currentLocation;
    		if ("splitUrl" in $$props) splitUrl = $$props.splitUrl;
    		if ("lastSugment" in $$props) lastSugment = $$props.lastSugment;
    		if ("map" in $$props) map = $$props.map;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [y, url, onwindowscroll];
    }

    class Show_detail extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { url: 1, y: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Show_detail",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*y*/ ctx[0] === undefined && !("y" in props)) {
    			console_1$3.warn("<Show_detail> was created without expected prop 'y'");
    		}
    	}

    	get url() {
    		throw new Error("<Show_detail>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Show_detail>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get y() {
    		throw new Error("<Show_detail>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<Show_detail>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/pages/profile.svelte generated by Svelte v3.38.3 */

    const { console: console_1$2, window: window_1$2 } = globals;
    const file$6 = "src/pages/profile.svelte";

    // (39:0) {#if y>600}
    function create_if_block$2(ctx) {
    	let section;
    	let div8;
    	let div7;
    	let div2;
    	let div1;
    	let button0;
    	let i0;
    	let t0;
    	let t1;
    	let div0;
    	let button1;
    	let t3;
    	let ul;
    	let li0;
    	let a0;
    	let i1;
    	let t4;
    	let t5;
    	let li1;
    	let a1;
    	let i2;
    	let t6;
    	let t7;
    	let div6;
    	let div5;
    	let div3;
    	let img;
    	let img_src_value;
    	let t8;
    	let div4;
    	let h5;
    	let t9;
    	let i3;
    	let br;
    	let span;
    	let div8_transition;
    	let current;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div8 = element("div");
    			div7 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			button0 = element("button");
    			i0 = element("i");
    			t0 = text("بازدید سایت");
    			t1 = space();
    			div0 = element("div");
    			button1 = element("button");
    			button1.textContent = "بیشتر";
    			t3 = space();
    			ul = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			i1 = element("i");
    			t4 = text(" اشتراک صفحه");
    			t5 = space();
    			li1 = element("li");
    			a1 = element("a");
    			i2 = element("i");
    			t6 = text(" گزارش دادن");
    			t7 = space();
    			div6 = element("div");
    			div5 = element("div");
    			div3 = element("div");
    			img = element("img");
    			t8 = space();
    			div4 = element("div");
    			h5 = element("h5");
    			t9 = text("آفرینه ");
    			i3 = element("i");
    			br = element("br");
    			span = element("span");
    			span.textContent = "مدیر شرکت آفرینه و مسپول سایت اینولینکس .به صفحه من خوش آمدید میتوانید مطالب مرتبط به شرکت آفرینه و کارآفرینی و کسب و کار را در اینجا مشاهده کنید";
    			attr_dev(i0, "class", "fas fa-external-link-alt padding-button ml-2 icon-size-scroll");
    			add_location(i0, file$6, 45, 108, 1550);
    			attr_dev(button0, "class", "btn rounded-pill font btn-mw-scroll-profile text-center visit-btn mx-0 ");
    			add_location(button0, file$6, 45, 20, 1462);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "data-toggle", "dropdown");
    			attr_dev(button1, "class", "pt-0 pl-md-3 pr-md-3 mr-2 px-lg-3 btn btn-sm btn-mw-scroll-profile rounded-pill col-12 font text-center col-md-7");
    			add_location(button1, file$6, 48, 24, 1771);
    			attr_dev(i1, "class", "fas fa-share-alt");
    			add_location(i1, file$6, 51, 44, 2088);
    			attr_dev(a0, "href", "#");
    			add_location(a0, file$6, 51, 32, 2076);
    			add_location(li0, file$6, 51, 28, 2072);
    			attr_dev(i2, "class", "fas fa-flag");
    			add_location(i2, file$6, 52, 44, 2187);
    			attr_dev(a1, "href", "#");
    			add_location(a1, file$6, 52, 32, 2175);
    			add_location(li1, file$6, 52, 28, 2171);
    			attr_dev(ul, "class", "dropdown-menu  ellipsis-menu");
    			add_location(ul, file$6, 50, 24, 2002);
    			attr_dev(div0, "class", "col-5 mr-0 justify-content-start navbar dropdown dropleft px-2");
    			add_location(div0, file$6, 47, 20, 1670);
    			attr_dev(div1, "class", "row justify-content-end vm-navbar");
    			add_location(div1, file$6, 44, 16, 1394);
    			attr_dev(div2, "class", "col-8 col-md-4 direction my-auto");
    			add_location(div2, file$6, 43, 12, 1330);
    			if (img.src !== (img_src_value = "image/1.jpeg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "logo-cu-scroll-profile");
    			attr_dev(img, "alt", "");
    			add_location(img, file$6, 60, 24, 2518);
    			attr_dev(div3, "class", "col-1 mr-3  mt-0");
    			add_location(div3, file$6, 59, 20, 2463);
    			set_style(i3, "color", "#048af7");
    			set_style(i3, "font-size", "13px");
    			attr_dev(i3, "class", "fas fa-check-circle");
    			add_location(i3, file$6, 63, 83, 2737);
    			add_location(br, file$6, 63, 157, 2811);
    			attr_dev(span, "class", "explain-about-page-scroll");
    			add_location(span, file$6, 63, 161, 2815);
    			attr_dev(h5, "class", "text-logo-scroll-profile mt-0 mr-0");
    			add_location(h5, file$6, 63, 24, 2678);
    			attr_dev(div4, "class", "col-10 pr-0");
    			add_location(div4, file$6, 62, 20, 2628);
    			attr_dev(div5, "class", "row mr-3 ");
    			add_location(div5, file$6, 58, 16, 2419);
    			attr_dev(div6, "class", "col-6  col-md-8 bg-light py-2  direction ");
    			add_location(div6, file$6, 57, 12, 2346);
    			attr_dev(div7, "class", "row justify-content-between shadow-sm mr-0");
    			add_location(div7, file$6, 42, 8, 1261);
    			attr_dev(div8, "class", "col-12 scroll-div bg-light pr-0 mr-5 nav-custome-top");
    			add_location(div8, file$6, 41, 4, 1169);
    			attr_dev(section, "class", "row nav-mag-scroll pr-0 mr-0 bg-light mt-0 d-none d-md-inline");
    			add_location(section, file$6, 39, 0, 1078);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div2);
    			append_dev(div2, div1);
    			append_dev(div1, button0);
    			append_dev(button0, i0);
    			append_dev(button0, t0);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, button1);
    			append_dev(div0, t3);
    			append_dev(div0, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(a0, i1);
    			append_dev(a0, t4);
    			append_dev(ul, t5);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(a1, i2);
    			append_dev(a1, t6);
    			append_dev(div7, t7);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div3);
    			append_dev(div3, img);
    			append_dev(div5, t8);
    			append_dev(div5, div4);
    			append_dev(div4, h5);
    			append_dev(h5, t9);
    			append_dev(h5, i3);
    			append_dev(h5, br);
    			append_dev(h5, span);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div8_transition) div8_transition = create_bidirectional_transition(div8, slide, {}, true);
    				div8_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div8_transition) div8_transition = create_bidirectional_transition(div8, slide, {}, false);
    			div8_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			if (detaching && div8_transition) div8_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(39:0) {#if y>600}",
    		ctx
    	});

    	return block;
    }

    // (37:0) <Router url="{url}">
    function create_default_slot$2(ctx) {
    	let t0;
    	let main;
    	let div58;
    	let aside0;
    	let div3;
    	let div2;
    	let div1;
    	let div0;
    	let a0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let aside2;
    	let div14;
    	let div13;
    	let div12;
    	let div4;
    	let img1;
    	let img1_src_value;
    	let t2;
    	let div5;
    	let img2;
    	let img2_src_value;
    	let t3;
    	let div11;
    	let div10;
    	let div9;
    	let h30;
    	let t5;
    	let h60;
    	let i0;
    	let t6;
    	let t7;
    	let h61;
    	let t9;
    	let div8;
    	let div7;
    	let button0;
    	let i1;
    	let t10;
    	let t11;
    	let div6;
    	let button1;
    	let t13;
    	let ul0;
    	let li0;
    	let a1;
    	let i2;
    	let t14;
    	let t15;
    	let li1;
    	let a2;
    	let i3;
    	let t16;
    	let t17;
    	let div57;
    	let div56;
    	let div55;
    	let aside1;
    	let section;
    	let div54;
    	let article0;
    	let div22;
    	let div21;
    	let div19;
    	let div18;
    	let div15;
    	let img3;
    	let img3_src_value;
    	let t18;
    	let div17;
    	let div16;
    	let h62;
    	let a3;
    	let t20;
    	let span0;
    	let i4;
    	let t21;
    	let t22;
    	let div20;
    	let i5;
    	let t23;
    	let ul1;
    	let li2;
    	let a4;
    	let i6;
    	let t24;
    	let t25;
    	let li3;
    	let a5;
    	let i7;
    	let t26;
    	let t27;
    	let li4;
    	let a6;
    	let i8;
    	let t28;
    	let t29;
    	let div23;
    	let h31;
    	let a7;
    	let t31;
    	let div24;
    	let img4;
    	let img4_src_value;
    	let t32;
    	let p0;
    	let span1;
    	let t34;
    	let span2;
    	let t36;
    	let span3;
    	let div25;
    	let a8;
    	let button2;
    	let t38;
    	let div27;
    	let div26;
    	let i9;
    	let t39;
    	let t40;
    	let article1;
    	let div35;
    	let div34;
    	let div32;
    	let div31;
    	let div28;
    	let img5;
    	let img5_src_value;
    	let t41;
    	let div30;
    	let div29;
    	let h63;
    	let a9;
    	let t43;
    	let span4;
    	let i10;
    	let t44;
    	let t45;
    	let div33;
    	let i11;
    	let t46;
    	let ul2;
    	let li5;
    	let a10;
    	let i12;
    	let t47;
    	let t48;
    	let li6;
    	let a11;
    	let i13;
    	let t49;
    	let t50;
    	let li7;
    	let a12;
    	let i14;
    	let t51;
    	let t52;
    	let div36;
    	let h32;
    	let a13;
    	let t54;
    	let div37;
    	let img6;
    	let img6_src_value;
    	let t55;
    	let p1;
    	let span5;
    	let t57;
    	let span6;
    	let t59;
    	let span7;
    	let div38;
    	let a14;
    	let button3;
    	let t61;
    	let div40;
    	let div39;
    	let i15;
    	let t62;
    	let t63;
    	let article2;
    	let div48;
    	let div47;
    	let div45;
    	let div44;
    	let div41;
    	let img7;
    	let img7_src_value;
    	let t64;
    	let div43;
    	let div42;
    	let h64;
    	let a15;
    	let t66;
    	let span8;
    	let i16;
    	let t67;
    	let t68;
    	let div46;
    	let i17;
    	let t69;
    	let ul3;
    	let li8;
    	let a16;
    	let i18;
    	let t70;
    	let t71;
    	let li9;
    	let a17;
    	let i19;
    	let t72;
    	let t73;
    	let li10;
    	let a18;
    	let i20;
    	let t74;
    	let t75;
    	let div49;
    	let h33;
    	let a19;
    	let t77;
    	let div50;
    	let img8;
    	let img8_src_value;
    	let t78;
    	let p2;
    	let span9;
    	let t80;
    	let span10;
    	let t82;
    	let span11;
    	let div51;
    	let a20;
    	let button4;
    	let t84;
    	let div53;
    	let div52;
    	let i21;
    	let t85;
    	let main_transition;
    	let t86;
    	let br0;
    	let br1;
    	let current;
    	let if_block = /*y*/ ctx[1] > 600 && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t0 = space();
    			main = element("main");
    			div58 = element("div");
    			aside0 = element("aside");
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			a0 = element("a");
    			img0 = element("img");
    			t1 = space();
    			aside2 = element("aside");
    			div14 = element("div");
    			div13 = element("div");
    			div12 = element("div");
    			div4 = element("div");
    			img1 = element("img");
    			t2 = space();
    			div5 = element("div");
    			img2 = element("img");
    			t3 = space();
    			div11 = element("div");
    			div10 = element("div");
    			div9 = element("div");
    			h30 = element("h3");
    			h30.textContent = "مسعود آقایی ساداتی ";
    			t5 = space();
    			h60 = element("h6");
    			i0 = element("i");
    			t6 = text(" تهران,شهرک طالقانی,ساحتمان نگین");
    			t7 = space();
    			h61 = element("h6");
    			h61.textContent = "مدیر شرکت آفرینه و مسپول سایت اینولینکس .به صفحه من خوش آمدید میتوانید مطالب مرتبط به شرکت آفرینه و کارآفرینی و کسب و کار را در اینجا مشاهده کنید";
    			t9 = space();
    			div8 = element("div");
    			div7 = element("div");
    			button0 = element("button");
    			i1 = element("i");
    			t10 = text("بازدید سایت");
    			t11 = space();
    			div6 = element("div");
    			button1 = element("button");
    			button1.textContent = "بیشتر";
    			t13 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			a1 = element("a");
    			i2 = element("i");
    			t14 = text(" اشتراک صفحه");
    			t15 = space();
    			li1 = element("li");
    			a2 = element("a");
    			i3 = element("i");
    			t16 = text(" گزارش دادن");
    			t17 = space();
    			div57 = element("div");
    			div56 = element("div");
    			div55 = element("div");
    			aside1 = element("aside");
    			section = element("section");
    			div54 = element("div");
    			article0 = element("article");
    			div22 = element("div");
    			div21 = element("div");
    			div19 = element("div");
    			div18 = element("div");
    			div15 = element("div");
    			img3 = element("img");
    			t18 = space();
    			div17 = element("div");
    			div16 = element("div");
    			h62 = element("h6");
    			a3 = element("a");
    			a3.textContent = "مسعود آفایی ساداتی ";
    			t20 = space();
    			span0 = element("span");
    			i4 = element("i");
    			t21 = text(" ۳ دقیقه قبل");
    			t22 = space();
    			div20 = element("div");
    			i5 = element("i");
    			t23 = space();
    			ul1 = element("ul");
    			li2 = element("li");
    			a4 = element("a");
    			i6 = element("i");
    			t24 = text(" ذخیره کردن پست");
    			t25 = space();
    			li3 = element("li");
    			a5 = element("a");
    			i7 = element("i");
    			t26 = text(" کپی کردن لینک");
    			t27 = space();
    			li4 = element("li");
    			a6 = element("a");
    			i8 = element("i");
    			t28 = text(" گزارش دادن");
    			t29 = space();
    			div23 = element("div");
    			h31 = element("h3");
    			a7 = element("a");
    			a7.textContent = "به اینولینکس خوش آمدید";
    			t31 = space();
    			div24 = element("div");
    			img4 = element("img");
    			t32 = space();
    			p0 = element("p");
    			span1 = element("span");
    			span1.textContent = "طراحان سایت هنگام طراحی قالب سایت معمولا با این موضوع رو برو هستند که محتوای اصلی صفحات آماده نیست. در نتیجه طرح کلی دید درستی به کار فرما نمیدهد. اگر طراح بخواهد دنبال متن های مرتبط بگردد تمرکزش از روی کار اصلی برداشته میشود و اینکار زمان بر خواهد بود. همچنین طراح به دنبال این است که پس از ارایه کار نظر دیگران را در مورد طراحی جویا شود و نمی‌خواهد افراد روی متن های موجود تمرکز کنند.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n            نکته بعدی در مورد متن ساختگی لورم ایپسوم این است که بعضی از طراحان وبسایت و گرافیست کاران بعد از آنکه قالب و محتوای مورد نظرشون را ایجاد کردند از یاد می‌برند که متن لورم را از قسمتهای مختلف .";
    			t34 = space();
    			span2 = element("span");
    			span2.textContent = "بیشتر بخوانید";
    			t36 = space();
    			span3 = element("span");
    			div25 = element("div");
    			a8 = element("a");
    			button2 = element("button");
    			button2.textContent = "ادامه مطلب";
    			t38 = space();
    			div27 = element("div");
    			div26 = element("div");
    			i9 = element("i");
    			t39 = text(" ۵۶");
    			t40 = space();
    			article1 = element("article");
    			div35 = element("div");
    			div34 = element("div");
    			div32 = element("div");
    			div31 = element("div");
    			div28 = element("div");
    			img5 = element("img");
    			t41 = space();
    			div30 = element("div");
    			div29 = element("div");
    			h63 = element("h6");
    			a9 = element("a");
    			a9.textContent = "مسعود آفایی ساداتی ";
    			t43 = space();
    			span4 = element("span");
    			i10 = element("i");
    			t44 = text(" ۳ دقیقه قبل");
    			t45 = space();
    			div33 = element("div");
    			i11 = element("i");
    			t46 = space();
    			ul2 = element("ul");
    			li5 = element("li");
    			a10 = element("a");
    			i12 = element("i");
    			t47 = text(" ذخیره کردن پست");
    			t48 = space();
    			li6 = element("li");
    			a11 = element("a");
    			i13 = element("i");
    			t49 = text(" کپی کردن لینک");
    			t50 = space();
    			li7 = element("li");
    			a12 = element("a");
    			i14 = element("i");
    			t51 = text(" گزارش دادن");
    			t52 = space();
    			div36 = element("div");
    			h32 = element("h3");
    			a13 = element("a");
    			a13.textContent = "به اینولینکس خوش آمدید";
    			t54 = space();
    			div37 = element("div");
    			img6 = element("img");
    			t55 = space();
    			p1 = element("p");
    			span5 = element("span");
    			span5.textContent = "طراحان سایت هنگام طراحی قالب سایت معمولا با این موضوع رو برو هستند که محتوای اصلی صفحات آماده نیست. در نتیجه طرح کلی دید درستی به کار فرما نمیدهد. اگر طراح بخواهد دنبال متن های مرتبط بگردد تمرکزش از روی کار اصلی برداشته میشود و اینکار زمان بر خواهد بود. همچنین طراح به دنبال این است که پس از ارایه کار نظر دیگران را در مورد طراحی جویا شود و نمی‌خواهد افراد روی متن های موجود تمرکز کنند.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n            نکته بعدی در مورد متن ساختگی لورم ایپسوم این است که بعضی از طراحان وبسایت و گرافیست کاران بعد از آنکه قالب و محتوای مورد نظرشون را ایجاد کردند از یاد می‌برند که متن لورم را از قسمتهای مختلف .";
    			t57 = space();
    			span6 = element("span");
    			span6.textContent = "بیشتر بخوانید";
    			t59 = space();
    			span7 = element("span");
    			div38 = element("div");
    			a14 = element("a");
    			button3 = element("button");
    			button3.textContent = "ادامه مطلب";
    			t61 = space();
    			div40 = element("div");
    			div39 = element("div");
    			i15 = element("i");
    			t62 = text(" ۵۶");
    			t63 = space();
    			article2 = element("article");
    			div48 = element("div");
    			div47 = element("div");
    			div45 = element("div");
    			div44 = element("div");
    			div41 = element("div");
    			img7 = element("img");
    			t64 = space();
    			div43 = element("div");
    			div42 = element("div");
    			h64 = element("h6");
    			a15 = element("a");
    			a15.textContent = "مسعود آفایی ساداتی ";
    			t66 = space();
    			span8 = element("span");
    			i16 = element("i");
    			t67 = text(" ۳ دقیقه قبل");
    			t68 = space();
    			div46 = element("div");
    			i17 = element("i");
    			t69 = space();
    			ul3 = element("ul");
    			li8 = element("li");
    			a16 = element("a");
    			i18 = element("i");
    			t70 = text(" ذخیره کردن پست");
    			t71 = space();
    			li9 = element("li");
    			a17 = element("a");
    			i19 = element("i");
    			t72 = text(" کپی کردن لینک");
    			t73 = space();
    			li10 = element("li");
    			a18 = element("a");
    			i20 = element("i");
    			t74 = text(" گزارش دادن");
    			t75 = space();
    			div49 = element("div");
    			h33 = element("h3");
    			a19 = element("a");
    			a19.textContent = "به اینولینکس خوش آمدید";
    			t77 = space();
    			div50 = element("div");
    			img8 = element("img");
    			t78 = space();
    			p2 = element("p");
    			span9 = element("span");
    			span9.textContent = "طراحان سایت هنگام طراحی قالب سایت معمولا با این موضوع رو برو هستند که محتوای اصلی صفحات آماده نیست. در نتیجه طرح کلی دید درستی به کار فرما نمیدهد. اگر طراح بخواهد دنبال متن های مرتبط بگردد تمرکزش از روی کار اصلی برداشته میشود و اینکار زمان بر خواهد بود. همچنین طراح به دنبال این است که پس از ارایه کار نظر دیگران را در مورد طراحی جویا شود و نمی‌خواهد افراد روی متن های موجود تمرکز کنند.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n            نکته بعدی در مورد متن ساختگی لورم ایپسوم این است که بعضی از طراحان وبسایت و گرافیست کاران بعد از آنکه قالب و محتوای مورد نظرشون را ایجاد کردند از یاد می‌برند که متن لورم را از قسمتهای مختلف .";
    			t80 = space();
    			span10 = element("span");
    			span10.textContent = "بیشتر بخوانید";
    			t82 = space();
    			span11 = element("span");
    			div51 = element("div");
    			a20 = element("a");
    			button4 = element("button");
    			button4.textContent = "ادامه مطلب";
    			t84 = space();
    			div53 = element("div");
    			div52 = element("div");
    			i21 = element("i");
    			t85 = text(" ۵۶");
    			t86 = space();
    			br0 = element("br");
    			br1 = element("br");
    			attr_dev(img0, "class", "w-100 dream-job-image");
    			if (img0.src !== (img0_src_value = "image/job.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$6, 85, 32, 3598);
    			attr_dev(a0, "href", "#");
    			add_location(a0, file$6, 84, 28, 3553);
    			attr_dev(div0, "class", "col-12 my-1");
    			add_location(div0, file$6, 83, 24, 3499);
    			attr_dev(div1, "class", "row ");
    			add_location(div1, file$6, 82, 20, 3456);
    			attr_dev(div2, "class", "col-12 shadow-radius-section bg-light");
    			add_location(div2, file$6, 81, 16, 3384);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file$6, 80, 12, 3350);
    			attr_dev(aside0, "class", "col-12 col-md-3 mr-2 d-none d-lg-inline");
    			add_location(aside0, file$6, 79, 8, 3281);
    			attr_dev(img1, "class", " header-image-person bg-light");
    			if (img1.src !== (img1_src_value = "image/head.jpeg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$6, 97, 28, 4089);
    			attr_dev(div4, "class", "col-12 p-0 banner");
    			add_location(div4, file$6, 96, 24, 4028);
    			attr_dev(img2, "class", "header-logo-image-person border-radius");
    			if (img2.src !== (img2_src_value = "image/1.jpeg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$6, 100, 28, 4298);
    			attr_dev(div5, "class", "col-12 header-image-main border-radius");
    			add_location(div5, file$6, 99, 24, 4217);
    			attr_dev(h30, "class", "text-bold text-font-size");
    			add_location(h30, file$6, 105, 36, 4608);
    			attr_dev(i0, "class", "fas fa-map-marker-alt");
    			add_location(i0, file$6, 106, 63, 4822);
    			attr_dev(h60, "class", "text-secondary");
    			add_location(h60, file$6, 106, 36, 4795);
    			attr_dev(h61, "class", "explain-about-page");
    			add_location(h61, file$6, 107, 36, 4938);
    			attr_dev(i1, "class", "fas fa-external-link-alt padding-button ml-2 icon-size");
    			add_location(i1, file$6, 110, 148, 5404);
    			attr_dev(button0, "class", "btn rounded-pill mb-1 col-custom font btn-mw-profile text-center visit-btn mx-0 mx-sm-1");
    			add_location(button0, file$6, 110, 44, 5300);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "data-toggle", "dropdown");
    			attr_dev(button1, "class", "pt-custome-more-btn btn btn-mw-profile rounded-pill col-12 font text-center col-md-6 mr-2");
    			add_location(button1, file$6, 112, 48, 5670);
    			attr_dev(i2, "class", "fas fa-share-alt");
    			add_location(i2, file$6, 114, 68, 5986);
    			attr_dev(a1, "href", "#");
    			add_location(a1, file$6, 114, 56, 5974);
    			add_location(li0, file$6, 114, 52, 5970);
    			attr_dev(i3, "class", "fas fa-flag");
    			add_location(i3, file$6, 115, 68, 6109);
    			attr_dev(a2, "href", "#");
    			add_location(a2, file$6, 115, 56, 6097);
    			add_location(li1, file$6, 115, 52, 6093);
    			attr_dev(ul0, "class", "dropdown-menu  ellipsis-menu");
    			add_location(ul0, file$6, 113, 48, 5876);
    			attr_dev(div6, "class", "col-12 col-md-3 justify-content-start navbar dropdown dropleft pr-1");
    			add_location(div6, file$6, 111, 44, 5540);
    			attr_dev(div7, "class", "row vm-navbar");
    			add_location(div7, file$6, 109, 40, 5228);
    			attr_dev(div8, "class", "col-12 mt-4 font");
    			add_location(div8, file$6, 108, 36, 5157);
    			attr_dev(div9, "class", "col-10 ");
    			add_location(div9, file$6, 104, 32, 4550);
    			attr_dev(div10, "class", "row");
    			add_location(div10, file$6, 103, 28, 4500);
    			attr_dev(div11, "class", "header-detail col-12 pb-3");
    			add_location(div11, file$6, 102, 24, 4432);
    			attr_dev(div12, "class", "row p-0 shadow-radius-section bg-white");
    			add_location(div12, file$6, 95, 20, 3950);
    			attr_dev(div13, "class", "col-12 ");
    			add_location(div13, file$6, 94, 16, 3908);
    			attr_dev(div14, "class", "row ml-md-1 ");
    			add_location(div14, file$6, 93, 12, 3865);
    			attr_dev(img3, "class", "cu-image mr-1 ");
    			if (img3.src !== (img3_src_value = "image/1.jpeg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "");
    			add_location(img3, file$6, 149, 60, 8421);
    			attr_dev(div15, "class", "col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width");
    			add_location(div15, file$6, 148, 56, 8291);
    			attr_dev(a3, "href", "magezine");
    			attr_dev(a3, "class", "title-post-link");
    			add_location(a3, file$6, 153, 68, 8874);
    			add_location(h62, file$6, 153, 64, 8870);
    			attr_dev(i4, "class", "fas fa-clock");
    			add_location(i4, file$6, 154, 96, 9115);
    			attr_dev(span0, "class", "show-time-custome");
    			add_location(span0, file$6, 154, 64, 9083);
    			attr_dev(div16, "class", "cu-intro mt-2");
    			add_location(div16, file$6, 152, 60, 8778);
    			attr_dev(div17, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-0 pr-md-4 mr-lg-2 mr-xl-0 pr-xl-3 justify-content-center custome-margin-right ");
    			add_location(div17, file$6, 151, 56, 8595);
    			attr_dev(div18, "class", "row ");
    			add_location(div18, file$6, 147, 52, 8216);
    			attr_dev(div19, "class", "col-11 col-md-11");
    			add_location(div19, file$6, 146, 48, 8132);
    			attr_dev(i5, "class", "fas fa-ellipsis-h -1 ");
    			attr_dev(i5, "type", "button");
    			attr_dev(i5, "data-toggle", "dropdown");
    			add_location(i5, file$6, 160, 52, 9582);
    			attr_dev(i6, "class", "far fa-bookmark");
    			add_location(i6, file$6, 162, 136, 9886);
    			attr_dev(a4, "class", "dropdown-item");
    			attr_dev(a4, "href", "#");
    			add_location(a4, file$6, 162, 101, 9851);
    			add_location(li2, file$6, 162, 56, 9806);
    			attr_dev(i7, "class", "fas fa-share-alt");
    			add_location(i7, file$6, 163, 94, 10037);
    			attr_dev(a5, "class", "dropdown-item");
    			attr_dev(a5, "href", "#");
    			add_location(a5, file$6, 163, 60, 10003);
    			add_location(li3, file$6, 163, 56, 9999);
    			attr_dev(i8, "class", "fas fa-flag");
    			add_location(i8, file$6, 164, 94, 10188);
    			attr_dev(a6, "class", "dropdown-item");
    			attr_dev(a6, "href", "#");
    			add_location(a6, file$6, 164, 60, 10154);
    			add_location(li4, file$6, 164, 56, 10150);
    			attr_dev(ul1, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul1, file$6, 161, 52, 9709);
    			attr_dev(div20, "class", "report dropdown col-1 ml-0 pl-0 pr-3 navbar pr-md-3 pr-lg-4 ");
    			add_location(div20, file$6, 159, 48, 9455);
    			attr_dev(div21, "class", "row justify-content-between p-2 pl-4 pl-md-2");
    			add_location(div21, file$6, 145, 44, 8025);
    			attr_dev(div22, "class", "col-12");
    			add_location(div22, file$6, 144, 40, 7960);
    			attr_dev(a7, "class", "title-post-link");
    			attr_dev(a7, "href", "magezine/show-detail");
    			add_location(a7, file$6, 171, 88, 10641);
    			attr_dev(h31, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h31, file$6, 171, 44, 10597);
    			attr_dev(div23, "class", "col-12 p-0");
    			add_location(div23, file$6, 170, 40, 10528);
    			if (img4.src !== (img4_src_value = "image/30.jpg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img4, "alt", "");
    			add_location(img4, file$6, 174, 44, 10917);
    			attr_dev(div24, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div24, file$6, 173, 40, 10815);
    			attr_dev(span1, "class", "content d-inline");
    			add_location(span1, file$6, 178, 44, 11216);
    			attr_dev(span2, "class", "read-more-custom");
    			attr_dev(span2, "onclick", "readMore(this)");
    			set_style(span2, "cursor", "pointer");
    			add_location(span2, file$6, 190, 44, 14740);
    			attr_dev(button2, "class", "btn btn-sm btn-danger col-12 my-1 p-1 offset-0 font-family");
    			add_location(button2, file$6, 194, 56, 15182);
    			attr_dev(a8, "href", "magezine/show-detail");
    			attr_dev(a8, "class", "col-3 col-md-2 px-0");
    			add_location(a8, file$6, 193, 52, 15066);
    			attr_dev(div25, "class", "row pl-0 ml-0 pt-2 justify-content-end ");
    			add_location(div25, file$6, 192, 48, 14960);
    			attr_dev(span3, "class", "read-more ");
    			add_location(span3, file$6, 191, 44, 14886);
    			attr_dev(p0, "class", "post-text col-12 mt-3 post-text");
    			add_location(p0, file$6, 177, 40, 11128);
    			attr_dev(i9, "class", "fas fa-eye");
    			add_location(i9, file$6, 202, 68, 15731);
    			attr_dev(div26, "class", "view-count");
    			add_location(div26, file$6, 202, 44, 15707);
    			attr_dev(div27, "class", "col-12 mb-1 author-show-box pt-1");
    			add_location(div27, file$6, 200, 40, 15571);
    			attr_dev(article0, "class", "p-0  shadow-radius-section shadow-section mb-4 bg-light");
    			add_location(article0, file$6, 143, 36, 7846);
    			attr_dev(img5, "class", "cu-image mr-1 ");
    			if (img5.src !== (img5_src_value = "image/1.jpeg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "");
    			add_location(img5, file$6, 211, 60, 16472);
    			attr_dev(div28, "class", "col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width");
    			add_location(div28, file$6, 210, 56, 16342);
    			attr_dev(a9, "href", "magezine");
    			attr_dev(a9, "class", "title-post-link");
    			add_location(a9, file$6, 215, 68, 16925);
    			add_location(h63, file$6, 215, 64, 16921);
    			attr_dev(i10, "class", "fas fa-clock");
    			add_location(i10, file$6, 216, 96, 17166);
    			attr_dev(span4, "class", "show-time-custome");
    			add_location(span4, file$6, 216, 64, 17134);
    			attr_dev(div29, "class", "cu-intro mt-2");
    			add_location(div29, file$6, 214, 60, 16829);
    			attr_dev(div30, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-0 pr-md-4 mr-lg-2 mr-xl-0 pr-xl-3 justify-content-center custome-margin-right ");
    			add_location(div30, file$6, 213, 56, 16646);
    			attr_dev(div31, "class", "row ");
    			add_location(div31, file$6, 209, 52, 16267);
    			attr_dev(div32, "class", "col-11 col-md-11");
    			add_location(div32, file$6, 208, 48, 16183);
    			attr_dev(i11, "class", "fas fa-ellipsis-h -1 ");
    			attr_dev(i11, "type", "button");
    			attr_dev(i11, "data-toggle", "dropdown");
    			add_location(i11, file$6, 222, 52, 17633);
    			attr_dev(i12, "class", "far fa-bookmark");
    			add_location(i12, file$6, 224, 136, 17937);
    			attr_dev(a10, "class", "dropdown-item");
    			attr_dev(a10, "href", "#");
    			add_location(a10, file$6, 224, 101, 17902);
    			add_location(li5, file$6, 224, 56, 17857);
    			attr_dev(i13, "class", "fas fa-share-alt");
    			add_location(i13, file$6, 225, 94, 18088);
    			attr_dev(a11, "class", "dropdown-item");
    			attr_dev(a11, "href", "#");
    			add_location(a11, file$6, 225, 60, 18054);
    			add_location(li6, file$6, 225, 56, 18050);
    			attr_dev(i14, "class", "fas fa-flag");
    			add_location(i14, file$6, 226, 94, 18239);
    			attr_dev(a12, "class", "dropdown-item");
    			attr_dev(a12, "href", "#");
    			add_location(a12, file$6, 226, 60, 18205);
    			add_location(li7, file$6, 226, 56, 18201);
    			attr_dev(ul2, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul2, file$6, 223, 52, 17760);
    			attr_dev(div33, "class", "report dropdown col-1 ml-0 pl-0 pr-3 navbar pr-md-3 pr-lg-4 ");
    			add_location(div33, file$6, 221, 48, 17506);
    			attr_dev(div34, "class", "row justify-content-between p-2 pl-4 pl-md-2");
    			add_location(div34, file$6, 207, 44, 16076);
    			attr_dev(div35, "class", "col-12");
    			add_location(div35, file$6, 206, 40, 16011);
    			attr_dev(a13, "class", "title-post-link");
    			attr_dev(a13, "href", "magezine/show-detail");
    			add_location(a13, file$6, 233, 88, 18692);
    			attr_dev(h32, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h32, file$6, 233, 44, 18648);
    			attr_dev(div36, "class", "col-12 p-0");
    			add_location(div36, file$6, 232, 40, 18579);
    			if (img6.src !== (img6_src_value = "image/30.jpg")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img6, "alt", "");
    			add_location(img6, file$6, 236, 44, 18968);
    			attr_dev(div37, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div37, file$6, 235, 40, 18866);
    			attr_dev(span5, "class", "content d-inline");
    			add_location(span5, file$6, 240, 44, 19267);
    			attr_dev(span6, "class", "read-more-custom");
    			attr_dev(span6, "onclick", "readMore(this)");
    			set_style(span6, "cursor", "pointer");
    			add_location(span6, file$6, 252, 44, 22791);
    			attr_dev(button3, "class", "btn btn-sm btn-danger col-12 my-1 p-1 offset-0 font-family");
    			add_location(button3, file$6, 256, 56, 23233);
    			attr_dev(a14, "href", "magezine/show-detail");
    			attr_dev(a14, "class", "col-3 col-md-2 px-0");
    			add_location(a14, file$6, 255, 52, 23117);
    			attr_dev(div38, "class", "row pl-0 ml-0 pt-2 justify-content-end ");
    			add_location(div38, file$6, 254, 48, 23011);
    			attr_dev(span7, "class", "read-more ");
    			add_location(span7, file$6, 253, 44, 22937);
    			attr_dev(p1, "class", "post-text col-12 mt-3 post-text");
    			add_location(p1, file$6, 239, 40, 19179);
    			attr_dev(i15, "class", "fas fa-eye");
    			add_location(i15, file$6, 264, 68, 23782);
    			attr_dev(div39, "class", "view-count");
    			add_location(div39, file$6, 264, 44, 23758);
    			attr_dev(div40, "class", "col-12 mb-1 author-show-box pt-1");
    			add_location(div40, file$6, 262, 40, 23622);
    			attr_dev(article1, "class", "p-0  shadow-radius-section shadow-section mb-4 bg-light");
    			add_location(article1, file$6, 205, 36, 15897);
    			attr_dev(img7, "class", "cu-image mr-1 ");
    			if (img7.src !== (img7_src_value = "image/1.jpeg")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "alt", "");
    			add_location(img7, file$6, 273, 60, 24523);
    			attr_dev(div41, "class", "col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width");
    			add_location(div41, file$6, 272, 56, 24393);
    			attr_dev(a15, "href", "magezine");
    			attr_dev(a15, "class", "title-post-link");
    			add_location(a15, file$6, 277, 68, 24976);
    			add_location(h64, file$6, 277, 64, 24972);
    			attr_dev(i16, "class", "fas fa-clock");
    			add_location(i16, file$6, 278, 96, 25217);
    			attr_dev(span8, "class", "show-time-custome");
    			add_location(span8, file$6, 278, 64, 25185);
    			attr_dev(div42, "class", "cu-intro mt-2");
    			add_location(div42, file$6, 276, 60, 24880);
    			attr_dev(div43, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-0 pr-md-4 mr-lg-2 mr-xl-0 pr-xl-3 justify-content-center custome-margin-right ");
    			add_location(div43, file$6, 275, 56, 24697);
    			attr_dev(div44, "class", "row ");
    			add_location(div44, file$6, 271, 52, 24318);
    			attr_dev(div45, "class", "col-11 col-md-11");
    			add_location(div45, file$6, 270, 48, 24234);
    			attr_dev(i17, "class", "fas fa-ellipsis-h -1 ");
    			attr_dev(i17, "type", "button");
    			attr_dev(i17, "data-toggle", "dropdown");
    			add_location(i17, file$6, 284, 52, 25684);
    			attr_dev(i18, "class", "far fa-bookmark");
    			add_location(i18, file$6, 286, 136, 25988);
    			attr_dev(a16, "class", "dropdown-item");
    			attr_dev(a16, "href", "#");
    			add_location(a16, file$6, 286, 101, 25953);
    			add_location(li8, file$6, 286, 56, 25908);
    			attr_dev(i19, "class", "fas fa-share-alt");
    			add_location(i19, file$6, 287, 94, 26139);
    			attr_dev(a17, "class", "dropdown-item");
    			attr_dev(a17, "href", "#");
    			add_location(a17, file$6, 287, 60, 26105);
    			add_location(li9, file$6, 287, 56, 26101);
    			attr_dev(i20, "class", "fas fa-flag");
    			add_location(i20, file$6, 288, 94, 26290);
    			attr_dev(a18, "class", "dropdown-item");
    			attr_dev(a18, "href", "#");
    			add_location(a18, file$6, 288, 60, 26256);
    			add_location(li10, file$6, 288, 56, 26252);
    			attr_dev(ul3, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul3, file$6, 285, 52, 25811);
    			attr_dev(div46, "class", "report dropdown col-1 ml-0 pl-0 pr-3 navbar pr-md-3 pr-lg-4 ");
    			add_location(div46, file$6, 283, 48, 25557);
    			attr_dev(div47, "class", "row justify-content-between p-2 pl-4 pl-md-2");
    			add_location(div47, file$6, 269, 44, 24127);
    			attr_dev(div48, "class", "col-12");
    			add_location(div48, file$6, 268, 40, 24062);
    			attr_dev(a19, "class", "title-post-link");
    			attr_dev(a19, "href", "magezine/show-detail");
    			add_location(a19, file$6, 295, 88, 26743);
    			attr_dev(h33, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h33, file$6, 295, 44, 26699);
    			attr_dev(div49, "class", "col-12 p-0");
    			add_location(div49, file$6, 294, 40, 26630);
    			if (img8.src !== (img8_src_value = "image/30.jpg")) attr_dev(img8, "src", img8_src_value);
    			attr_dev(img8, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img8, "alt", "");
    			add_location(img8, file$6, 298, 44, 27019);
    			attr_dev(div50, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div50, file$6, 297, 40, 26917);
    			attr_dev(span9, "class", "content d-inline");
    			add_location(span9, file$6, 302, 44, 27318);
    			attr_dev(span10, "class", "read-more-custom");
    			attr_dev(span10, "onclick", "readMore(this)");
    			set_style(span10, "cursor", "pointer");
    			add_location(span10, file$6, 314, 44, 30842);
    			attr_dev(button4, "class", "btn btn-sm btn-danger col-12 my-1 p-1 offset-0 font-family");
    			add_location(button4, file$6, 318, 56, 31284);
    			attr_dev(a20, "href", "magezine/show-detail");
    			attr_dev(a20, "class", "col-3 col-md-2 px-0");
    			add_location(a20, file$6, 317, 52, 31168);
    			attr_dev(div51, "class", "row pl-0 ml-0 pt-2 justify-content-end ");
    			add_location(div51, file$6, 316, 48, 31062);
    			attr_dev(span11, "class", "read-more ");
    			add_location(span11, file$6, 315, 44, 30988);
    			attr_dev(p2, "class", "post-text col-12 mt-3 post-text");
    			add_location(p2, file$6, 301, 40, 27230);
    			attr_dev(i21, "class", "fas fa-eye");
    			add_location(i21, file$6, 326, 68, 31833);
    			attr_dev(div52, "class", "view-count");
    			add_location(div52, file$6, 326, 44, 31809);
    			attr_dev(div53, "class", "col-12 mb-1 author-show-box pt-1");
    			add_location(div53, file$6, 324, 40, 31673);
    			attr_dev(article2, "class", "p-0  shadow-radius-section shadow-section mb-4 bg-light");
    			add_location(article2, file$6, 267, 36, 23948);
    			attr_dev(div54, "class", "col-12 p-0 main-article ");
    			add_location(div54, file$6, 142, 32, 7771);
    			attr_dev(section, "class", "row mx-0 mt-3 mr-0 pt-0  ");
    			add_location(section, file$6, 141, 28, 7695);
    			attr_dev(aside1, "class", "col-12 col-md-9 order-first justify-content-between order-md-0 mx-0 ");
    			add_location(aside1, file$6, 140, 24, 7582);
    			attr_dev(div55, "class", "row px-0 mx-0");
    			add_location(div55, file$6, 139, 20, 7529);
    			attr_dev(div56, "id", "post");
    			attr_dev(div56, "class", "row ");
    			add_location(div56, file$6, 138, 16, 7480);
    			attr_dev(div57, "class", "w-100 mr-0");
    			add_location(div57, file$6, 137, 12, 7439);
    			attr_dev(aside2, "class", "col-12 col-lg-8  ");
    			add_location(aside2, file$6, 92, 8, 3819);
    			attr_dev(div58, "class", "row justify-content-center mx-0");
    			add_location(div58, file$6, 77, 4, 3218);
    			attr_dev(main, "class", "container-fluid pin-parent px-0 px-md-3");
    			add_location(main, file$6, 76, 0, 3142);
    			add_location(br0, file$6, 352, 0, 32950);
    			add_location(br1, file$6, 352, 4, 32954);
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div58);
    			append_dev(div58, aside0);
    			append_dev(aside0, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, a0);
    			append_dev(a0, img0);
    			append_dev(div58, t1);
    			append_dev(div58, aside2);
    			append_dev(aside2, div14);
    			append_dev(div14, div13);
    			append_dev(div13, div12);
    			append_dev(div12, div4);
    			append_dev(div4, img1);
    			append_dev(div12, t2);
    			append_dev(div12, div5);
    			append_dev(div5, img2);
    			append_dev(div12, t3);
    			append_dev(div12, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, h30);
    			append_dev(div9, t5);
    			append_dev(div9, h60);
    			append_dev(h60, i0);
    			append_dev(h60, t6);
    			append_dev(div9, t7);
    			append_dev(div9, h61);
    			append_dev(div9, t9);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, button0);
    			append_dev(button0, i1);
    			append_dev(button0, t10);
    			append_dev(div7, t11);
    			append_dev(div7, div6);
    			append_dev(div6, button1);
    			append_dev(div6, t13);
    			append_dev(div6, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a1);
    			append_dev(a1, i2);
    			append_dev(a1, t14);
    			append_dev(ul0, t15);
    			append_dev(ul0, li1);
    			append_dev(li1, a2);
    			append_dev(a2, i3);
    			append_dev(a2, t16);
    			append_dev(aside2, t17);
    			append_dev(aside2, div57);
    			append_dev(div57, div56);
    			append_dev(div56, div55);
    			append_dev(div55, aside1);
    			append_dev(aside1, section);
    			append_dev(section, div54);
    			append_dev(div54, article0);
    			append_dev(article0, div22);
    			append_dev(div22, div21);
    			append_dev(div21, div19);
    			append_dev(div19, div18);
    			append_dev(div18, div15);
    			append_dev(div15, img3);
    			append_dev(div18, t18);
    			append_dev(div18, div17);
    			append_dev(div17, div16);
    			append_dev(div16, h62);
    			append_dev(h62, a3);
    			append_dev(div16, t20);
    			append_dev(div16, span0);
    			append_dev(span0, i4);
    			append_dev(span0, t21);
    			append_dev(div21, t22);
    			append_dev(div21, div20);
    			append_dev(div20, i5);
    			append_dev(div20, t23);
    			append_dev(div20, ul1);
    			append_dev(ul1, li2);
    			append_dev(li2, a4);
    			append_dev(a4, i6);
    			append_dev(a4, t24);
    			append_dev(ul1, t25);
    			append_dev(ul1, li3);
    			append_dev(li3, a5);
    			append_dev(a5, i7);
    			append_dev(a5, t26);
    			append_dev(ul1, t27);
    			append_dev(ul1, li4);
    			append_dev(li4, a6);
    			append_dev(a6, i8);
    			append_dev(a6, t28);
    			append_dev(article0, t29);
    			append_dev(article0, div23);
    			append_dev(div23, h31);
    			append_dev(h31, a7);
    			append_dev(article0, t31);
    			append_dev(article0, div24);
    			append_dev(div24, img4);
    			append_dev(article0, t32);
    			append_dev(article0, p0);
    			append_dev(p0, span1);
    			append_dev(p0, t34);
    			append_dev(p0, span2);
    			append_dev(p0, t36);
    			append_dev(p0, span3);
    			append_dev(span3, div25);
    			append_dev(div25, a8);
    			append_dev(a8, button2);
    			append_dev(article0, t38);
    			append_dev(article0, div27);
    			append_dev(div27, div26);
    			append_dev(div26, i9);
    			append_dev(div26, t39);
    			append_dev(div54, t40);
    			append_dev(div54, article1);
    			append_dev(article1, div35);
    			append_dev(div35, div34);
    			append_dev(div34, div32);
    			append_dev(div32, div31);
    			append_dev(div31, div28);
    			append_dev(div28, img5);
    			append_dev(div31, t41);
    			append_dev(div31, div30);
    			append_dev(div30, div29);
    			append_dev(div29, h63);
    			append_dev(h63, a9);
    			append_dev(div29, t43);
    			append_dev(div29, span4);
    			append_dev(span4, i10);
    			append_dev(span4, t44);
    			append_dev(div34, t45);
    			append_dev(div34, div33);
    			append_dev(div33, i11);
    			append_dev(div33, t46);
    			append_dev(div33, ul2);
    			append_dev(ul2, li5);
    			append_dev(li5, a10);
    			append_dev(a10, i12);
    			append_dev(a10, t47);
    			append_dev(ul2, t48);
    			append_dev(ul2, li6);
    			append_dev(li6, a11);
    			append_dev(a11, i13);
    			append_dev(a11, t49);
    			append_dev(ul2, t50);
    			append_dev(ul2, li7);
    			append_dev(li7, a12);
    			append_dev(a12, i14);
    			append_dev(a12, t51);
    			append_dev(article1, t52);
    			append_dev(article1, div36);
    			append_dev(div36, h32);
    			append_dev(h32, a13);
    			append_dev(article1, t54);
    			append_dev(article1, div37);
    			append_dev(div37, img6);
    			append_dev(article1, t55);
    			append_dev(article1, p1);
    			append_dev(p1, span5);
    			append_dev(p1, t57);
    			append_dev(p1, span6);
    			append_dev(p1, t59);
    			append_dev(p1, span7);
    			append_dev(span7, div38);
    			append_dev(div38, a14);
    			append_dev(a14, button3);
    			append_dev(article1, t61);
    			append_dev(article1, div40);
    			append_dev(div40, div39);
    			append_dev(div39, i15);
    			append_dev(div39, t62);
    			append_dev(div54, t63);
    			append_dev(div54, article2);
    			append_dev(article2, div48);
    			append_dev(div48, div47);
    			append_dev(div47, div45);
    			append_dev(div45, div44);
    			append_dev(div44, div41);
    			append_dev(div41, img7);
    			append_dev(div44, t64);
    			append_dev(div44, div43);
    			append_dev(div43, div42);
    			append_dev(div42, h64);
    			append_dev(h64, a15);
    			append_dev(div42, t66);
    			append_dev(div42, span8);
    			append_dev(span8, i16);
    			append_dev(span8, t67);
    			append_dev(div47, t68);
    			append_dev(div47, div46);
    			append_dev(div46, i17);
    			append_dev(div46, t69);
    			append_dev(div46, ul3);
    			append_dev(ul3, li8);
    			append_dev(li8, a16);
    			append_dev(a16, i18);
    			append_dev(a16, t70);
    			append_dev(ul3, t71);
    			append_dev(ul3, li9);
    			append_dev(li9, a17);
    			append_dev(a17, i19);
    			append_dev(a17, t72);
    			append_dev(ul3, t73);
    			append_dev(ul3, li10);
    			append_dev(li10, a18);
    			append_dev(a18, i20);
    			append_dev(a18, t74);
    			append_dev(article2, t75);
    			append_dev(article2, div49);
    			append_dev(div49, h33);
    			append_dev(h33, a19);
    			append_dev(article2, t77);
    			append_dev(article2, div50);
    			append_dev(div50, img8);
    			append_dev(article2, t78);
    			append_dev(article2, p2);
    			append_dev(p2, span9);
    			append_dev(p2, t80);
    			append_dev(p2, span10);
    			append_dev(p2, t82);
    			append_dev(p2, span11);
    			append_dev(span11, div51);
    			append_dev(div51, a20);
    			append_dev(a20, button4);
    			append_dev(article2, t84);
    			append_dev(article2, div53);
    			append_dev(div53, div52);
    			append_dev(div52, i21);
    			append_dev(div52, t85);
    			insert_dev(target, t86, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, br1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*y*/ ctx[1] > 600) {
    				if (if_block) {
    					if (dirty & /*y*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t0.parentNode, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);

    			add_render_callback(() => {
    				if (!main_transition) main_transition = create_bidirectional_transition(main, scale, {}, true);
    				main_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			if (!main_transition) main_transition = create_bidirectional_transition(main, scale, {}, false);
    			main_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			if (detaching && main_transition) main_transition.end();
    			if (detaching) detach_dev(t86);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(br1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$2.name,
    		type: "slot",
    		source: "(37:0) <Router url=\\\"{url}\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let scrolling = false;

    	let clear_scrolling = () => {
    		scrolling = false;
    	};

    	let scrolling_timeout;
    	let t;
    	let router;
    	let current;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowscroll*/ ctx[3]);
    	add_render_callback(/*onwindowresize*/ ctx[4]);

    	router = new Router({
    			props: {
    				url: /*url*/ ctx[2],
    				$$slots: { default: [create_default_slot$2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			t = space();
    			create_component(router.$$.fragment);
    			document.title = "\n        اینولینکس\n    ";
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			mount_component(router, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window_1$2, "scroll", () => {
    						scrolling = true;
    						clearTimeout(scrolling_timeout);
    						scrolling_timeout = setTimeout(clear_scrolling, 100);
    						/*onwindowscroll*/ ctx[3]();
    					}),
    					listen_dev(window_1$2, "resize", /*onwindowresize*/ ctx[4])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*y*/ 2 && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window_1$2.pageXOffset, /*y*/ ctx[1]);
    				scrolling_timeout = setTimeout(clear_scrolling, 100);
    			}

    			const router_changes = {};
    			if (dirty & /*url*/ 4) router_changes.url = /*url*/ ctx[2];

    			if (dirty & /*$$scope, y*/ 16386) {
    				router_changes.$$scope = { dirty, ctx };
    			}

    			router.$set(router_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    			destroy_component(router, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Profile", slots, []);
    	let { url = "" } = $$props;
    	let { y } = $$props;
    	let { x } = $$props;
    	const urlParams = new URLSearchParams(window.location.search);
    	const id = urlParams.has("id");
    	console.log(id);
    	let isOpen = false;
    	let current = "post";

    	function toggleNav() {
    		isOpen = !isOpen;
    	}

    	//let y=0;
    	var currentLocation = window.location.href;

    	var splitUrl = currentLocation.split("/");
    	var lastSugment = splitUrl[splitUrl.length - 1];

    	// $ : console.log(lastSugment);
    	let map;

    	const writable_props = ["url", "y", "x"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$2.warn(`<Profile> was created with unknown prop '${key}'`);
    	});

    	function onwindowscroll() {
    		$$invalidate(1, y = window_1$2.pageYOffset);
    	}

    	function onwindowresize() {
    		$$invalidate(0, x = window_1$2.innerWidth);
    	}

    	$$self.$$set = $$props => {
    		if ("url" in $$props) $$invalidate(2, url = $$props.url);
    		if ("y" in $$props) $$invalidate(1, y = $$props.y);
    		if ("x" in $$props) $$invalidate(0, x = $$props.x);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		fade,
    		slide,
    		scale,
    		fly,
    		Loader,
    		Router,
    		Link,
    		Route,
    		circIn,
    		showDetail: Show_detail,
    		url,
    		y,
    		x,
    		urlParams,
    		id,
    		isOpen,
    		current,
    		toggleNav,
    		currentLocation,
    		splitUrl,
    		lastSugment,
    		map
    	});

    	$$self.$inject_state = $$props => {
    		if ("url" in $$props) $$invalidate(2, url = $$props.url);
    		if ("y" in $$props) $$invalidate(1, y = $$props.y);
    		if ("x" in $$props) $$invalidate(0, x = $$props.x);
    		if ("isOpen" in $$props) isOpen = $$props.isOpen;
    		if ("current" in $$props) current = $$props.current;
    		if ("currentLocation" in $$props) currentLocation = $$props.currentLocation;
    		if ("splitUrl" in $$props) splitUrl = $$props.splitUrl;
    		if ("lastSugment" in $$props) lastSugment = $$props.lastSugment;
    		if ("map" in $$props) map = $$props.map;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*x*/ 1) {
    			console.log(x);
    		}
    	};

    	return [x, y, url, onwindowscroll, onwindowresize];
    }

    class Profile extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { url: 2, y: 1, x: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Profile",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*y*/ ctx[1] === undefined && !("y" in props)) {
    			console_1$2.warn("<Profile> was created without expected prop 'y'");
    		}

    		if (/*x*/ ctx[0] === undefined && !("x" in props)) {
    			console_1$2.warn("<Profile> was created without expected prop 'x'");
    		}
    	}

    	get url() {
    		throw new Error("<Profile>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Profile>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get y() {
    		throw new Error("<Profile>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<Profile>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get x() {
    		throw new Error("<Profile>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set x(value) {
    		throw new Error("<Profile>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/pages/magezine.svelte generated by Svelte v3.38.3 */

    const { console: console_1$1, window: window_1$1 } = globals;
    const file$5 = "src/pages/magezine.svelte";

    // (43:0) {#if y>600}
    function create_if_block_1$1(ctx) {
    	let section;
    	let div10;
    	let div7;
    	let div2;
    	let div1;
    	let button0;
    	let i0;
    	let t0;
    	let t1;
    	let div0;
    	let button1;
    	let t3;
    	let ul0;
    	let li0;
    	let a0;
    	let i1;
    	let t4;
    	let t5;
    	let li1;
    	let a1;
    	let i2;
    	let t6;
    	let t7;
    	let div6;
    	let div5;
    	let div3;
    	let img;
    	let img_src_value;
    	let t8;
    	let div4;
    	let h5;
    	let t9;
    	let i3;
    	let t10;
    	let div9;
    	let div8;
    	let ul1;
    	let li2;
    	let a2;
    	let t12;
    	let li3;
    	let a3;
    	let div10_transition;
    	let current;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div10 = element("div");
    			div7 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			button0 = element("button");
    			i0 = element("i");
    			t0 = text("بازدید سایت");
    			t1 = space();
    			div0 = element("div");
    			button1 = element("button");
    			button1.textContent = "بیشتر";
    			t3 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			i1 = element("i");
    			t4 = text(" اشتراک صفحه");
    			t5 = space();
    			li1 = element("li");
    			a1 = element("a");
    			i2 = element("i");
    			t6 = text(" گزارش دادن");
    			t7 = space();
    			div6 = element("div");
    			div5 = element("div");
    			div3 = element("div");
    			img = element("img");
    			t8 = space();
    			div4 = element("div");
    			h5 = element("h5");
    			t9 = text("آفرینه ");
    			i3 = element("i");
    			t10 = space();
    			div9 = element("div");
    			div8 = element("div");
    			ul1 = element("ul");
    			li2 = element("li");
    			a2 = element("a");
    			a2.textContent = "پست";
    			t12 = space();
    			li3 = element("li");
    			a3 = element("a");
    			a3.textContent = "درباره";
    			attr_dev(i0, "class", "fas fa-external-link-alt padding-button ml-2 icon-size-scroll");
    			add_location(i0, file$5, 49, 100, 1588);
    			attr_dev(button0, "class", "btn rounded-pill font btn-mw-scroll text-center visit-btn mx-0 ");
    			add_location(button0, file$5, 49, 20, 1508);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "data-toggle", "dropdown");
    			attr_dev(button1, "class", "pt-0 pl-md-3 pr-md-3 px-lg-3 btn btn-sm btn-mw-scroll rounded-pill col-12 font text-center col-md-7 mr-2");
    			add_location(button1, file$5, 52, 24, 1800);
    			attr_dev(i1, "class", "fas fa-share-alt");
    			add_location(i1, file$5, 56, 66, 2161);
    			attr_dev(a0, "href", "#");
    			add_location(a0, file$5, 56, 54, 2149);
    			attr_dev(li0, "class", "dropdown-item");
    			add_location(li0, file$5, 56, 28, 2123);
    			attr_dev(i2, "class", "fas fa-flag");
    			add_location(i2, file$5, 57, 66, 2282);
    			attr_dev(a1, "href", "#");
    			add_location(a1, file$5, 57, 54, 2270);
    			attr_dev(li1, "class", "dropdown-item");
    			add_location(li1, file$5, 57, 28, 2244);
    			attr_dev(ul0, "class", "dropdown-menu  ellipsis-menu ml-2");
    			add_location(ul0, file$5, 55, 24, 2048);
    			attr_dev(div0, "class", "col-5 mr-0 justify-content-start navbar dropleft px-2");
    			add_location(div0, file$5, 51, 20, 1708);
    			attr_dev(div1, "class", "row justify-content-end vm-navbar");
    			add_location(div1, file$5, 48, 16, 1440);
    			attr_dev(div2, "class", "col-8 col-md-4 direction my-auto");
    			add_location(div2, file$5, 47, 12, 1376);
    			if (img.src !== (img_src_value = "image/afarine.jpg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "logo-cu-scroll");
    			attr_dev(img, "alt", "");
    			add_location(img, file$5, 65, 24, 2616);
    			attr_dev(div3, "class", "col-1 mr-3  my-auto");
    			add_location(div3, file$5, 64, 20, 2558);
    			set_style(i3, "color", "#048af7");
    			set_style(i3, "font-size", "13px");
    			attr_dev(i3, "class", "fas fa-check-circle");
    			add_location(i3, file$5, 68, 75, 2819);
    			attr_dev(h5, "class", "text-logo-scroll mt-2 mr-2");
    			add_location(h5, file$5, 68, 24, 2768);
    			attr_dev(div4, "class", "col-10");
    			add_location(div4, file$5, 67, 20, 2723);
    			attr_dev(div5, "class", "row mr-3 ");
    			add_location(div5, file$5, 63, 16, 2514);
    			attr_dev(div6, "class", "col-6  col-md-5 bg-light py-2  direction ");
    			add_location(div6, file$5, 62, 12, 2441);
    			attr_dev(div7, "class", "row justify-content-between shadow-sm mr-0");
    			add_location(div7, file$5, 46, 8, 1307);
    			attr_dev(a2, "class", "py-2 nav-link-scroll");
    			attr_dev(a2, "data-toggle", "tab");
    			attr_dev(a2, "href", "#post");
    			toggle_class(a2, "active", /*current*/ ctx[3] === "post");
    			add_location(a2, file$5, 76, 53, 3223);
    			attr_dev(li2, "class", "nav-item-scroll mt-2");
    			add_location(li2, file$5, 76, 20, 3190);
    			attr_dev(a3, "class", "py-2 nav-link-scroll");
    			attr_dev(a3, "data-toggle", "tab");
    			attr_dev(a3, "href", "#about");
    			toggle_class(a3, "active", /*current*/ ctx[3] === "about");
    			add_location(a3, file$5, 77, 53, 3420);
    			attr_dev(li3, "class", "nav-item-scroll mt-2");
    			add_location(li3, file$5, 77, 20, 3387);
    			attr_dev(ul1, "class", "nav nav-tabs direction text-center");
    			attr_dev(ul1, "role", "tablist");
    			add_location(ul1, file$5, 75, 16, 3107);
    			attr_dev(div8, "class", "row  mx-4 scroll-main-height");
    			add_location(div8, file$5, 74, 12, 3048);
    			attr_dev(div9, "class", "col-12 mt-0 scroll-main-height");
    			add_location(div9, file$5, 73, 8, 2991);
    			attr_dev(div10, "class", "col-12 scroll-div bg-light pr-0 mr-5 nav-custome-top");
    			add_location(div10, file$5, 45, 4, 1215);
    			attr_dev(section, "class", "row nav-mag-scroll pr-0 mr-0 bg-light mt-0 d-none d-md-inline");
    			add_location(section, file$5, 43, 0, 1124);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div10);
    			append_dev(div10, div7);
    			append_dev(div7, div2);
    			append_dev(div2, div1);
    			append_dev(div1, button0);
    			append_dev(button0, i0);
    			append_dev(button0, t0);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, button1);
    			append_dev(div0, t3);
    			append_dev(div0, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a0);
    			append_dev(a0, i1);
    			append_dev(a0, t4);
    			append_dev(ul0, t5);
    			append_dev(ul0, li1);
    			append_dev(li1, a1);
    			append_dev(a1, i2);
    			append_dev(a1, t6);
    			append_dev(div7, t7);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div3);
    			append_dev(div3, img);
    			append_dev(div5, t8);
    			append_dev(div5, div4);
    			append_dev(div4, h5);
    			append_dev(h5, t9);
    			append_dev(h5, i3);
    			append_dev(div10, t10);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div8, ul1);
    			append_dev(ul1, li2);
    			append_dev(li2, a2);
    			append_dev(ul1, t12);
    			append_dev(ul1, li3);
    			append_dev(li3, a3);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(a2, "click", /*click_handler*/ ctx[6], false, false, false),
    					listen_dev(a3, "click", /*click_handler_1*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*current*/ 8) {
    				toggle_class(a2, "active", /*current*/ ctx[3] === "post");
    			}

    			if (dirty & /*current*/ 8) {
    				toggle_class(a3, "active", /*current*/ ctx[3] === "about");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!div10_transition) div10_transition = create_bidirectional_transition(div10, slide, {}, true);
    				div10_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!div10_transition) div10_transition = create_bidirectional_transition(div10, slide, {}, false);
    			div10_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			if (detaching && div10_transition) div10_transition.end();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(43:0) {#if y>600}",
    		ctx
    	});

    	return block;
    }

    // (386:40) {#if x<=767}
    function create_if_block$1(ctx) {
    	let button;
    	let span;

    	const block = {
    		c: function create() {
    			button = element("button");
    			span = element("span");
    			span.textContent = "×";
    			attr_dev(span, "class", "col-1 mt-1");
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$5, 390, 48, 36131);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "close row mx-2 justify-content-end");
    			attr_dev(button, "data-dismiss", "modal");
    			attr_dev(button, "aria-label", "Close");
    			add_location(button, file$5, 386, 44, 35866);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, span);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(386:40) {#if x<=767}",
    		ctx
    	});

    	return block;
    }

    // (41:0) <Router url="{url}">
    function create_default_slot$1(ctx) {
    	let t0;
    	let main;
    	let div124;
    	let aside0;
    	let div3;
    	let div2;
    	let div1;
    	let div0;
    	let a0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let aside3;
    	let div16;
    	let div15;
    	let div14;
    	let div4;
    	let img1;
    	let img1_src_value;
    	let t2;
    	let div5;
    	let img2;
    	let img2_src_value;
    	let t3;
    	let div11;
    	let div10;
    	let div9;
    	let h30;
    	let t4;
    	let i0;
    	let t5;
    	let h60;
    	let i1;
    	let t6;
    	let t7;
    	let h61;
    	let t9;
    	let div8;
    	let div7;
    	let button0;
    	let i2;
    	let t10;
    	let t11;
    	let div6;
    	let button1;
    	let t13;
    	let ul0;
    	let li0;
    	let a1;
    	let i3;
    	let t14;
    	let t15;
    	let li1;
    	let a2;
    	let i4;
    	let t16;
    	let t17;
    	let div13;
    	let div12;
    	let ul1;
    	let li2;
    	let a3;
    	let t19;
    	let li3;
    	let a4;
    	let t21;
    	let div123;
    	let div101;
    	let div100;
    	let aside1;
    	let section;
    	let div56;
    	let article0;
    	let div24;
    	let div23;
    	let div21;
    	let div20;
    	let div17;
    	let img3;
    	let img3_src_value;
    	let t22;
    	let div19;
    	let div18;
    	let h62;
    	let a5;
    	let t23;
    	let i5;
    	let t24;
    	let span0;
    	let i6;
    	let t25;
    	let t26;
    	let div22;
    	let i7;
    	let t27;
    	let ul2;
    	let li4;
    	let a6;
    	let i8;
    	let t28;
    	let t29;
    	let li5;
    	let a7;
    	let i9;
    	let t30;
    	let t31;
    	let li6;
    	let a8;
    	let i10;
    	let t32;
    	let t33;
    	let div25;
    	let h31;
    	let a9;
    	let t35;
    	let div26;
    	let img4;
    	let img4_src_value;
    	let t36;
    	let p0;
    	let span1;
    	let t38;
    	let span2;
    	let t40;
    	let span3;
    	let div27;
    	let a10;
    	let button2;
    	let t42;
    	let div29;
    	let a11;
    	let img5;
    	let img5_src_value;
    	let t43;
    	let span4;
    	let t45;
    	let t46;
    	let div28;
    	let i11;
    	let t47;
    	let t48;
    	let article1;
    	let div37;
    	let div36;
    	let div34;
    	let div33;
    	let div30;
    	let img6;
    	let img6_src_value;
    	let t49;
    	let div32;
    	let div31;
    	let h63;
    	let a12;
    	let t50;
    	let i12;
    	let t51;
    	let span5;
    	let i13;
    	let t52;
    	let t53;
    	let div35;
    	let i14;
    	let t54;
    	let ul3;
    	let li7;
    	let a13;
    	let i15;
    	let t55;
    	let t56;
    	let li8;
    	let a14;
    	let i16;
    	let t57;
    	let t58;
    	let li9;
    	let a15;
    	let i17;
    	let t59;
    	let t60;
    	let div38;
    	let h32;
    	let a16;
    	let t62;
    	let div39;
    	let img7;
    	let img7_src_value;
    	let t63;
    	let p1;
    	let span6;
    	let t65;
    	let span7;
    	let t67;
    	let span8;
    	let div40;
    	let a17;
    	let button3;
    	let t69;
    	let div42;
    	let a18;
    	let img8;
    	let img8_src_value;
    	let t70;
    	let span9;
    	let t72;
    	let t73;
    	let div41;
    	let i18;
    	let t74;
    	let t75;
    	let article2;
    	let div50;
    	let div49;
    	let div47;
    	let div46;
    	let div43;
    	let img9;
    	let img9_src_value;
    	let t76;
    	let div45;
    	let div44;
    	let h64;
    	let a19;
    	let t77;
    	let i19;
    	let t78;
    	let span10;
    	let i20;
    	let t79;
    	let t80;
    	let div48;
    	let i21;
    	let t81;
    	let ul4;
    	let li10;
    	let a20;
    	let i22;
    	let t82;
    	let t83;
    	let li11;
    	let a21;
    	let i23;
    	let t84;
    	let t85;
    	let li12;
    	let a22;
    	let i24;
    	let t86;
    	let t87;
    	let div51;
    	let h33;
    	let a23;
    	let t89;
    	let div52;
    	let img10;
    	let img10_src_value;
    	let t90;
    	let p2;
    	let span11;
    	let t92;
    	let span12;
    	let t94;
    	let span13;
    	let div53;
    	let a24;
    	let button4;
    	let t96;
    	let div55;
    	let a25;
    	let img11;
    	let img11_src_value;
    	let t97;
    	let span14;
    	let t99;
    	let t100;
    	let div54;
    	let i25;
    	let t101;
    	let t102;
    	let aside2;
    	let div58;
    	let div57;
    	let img12;
    	let img12_src_value;
    	let t103;
    	let h34;
    	let t105;
    	let h65;
    	let t107;
    	let div99;
    	let div59;
    	let a26;
    	let i26;
    	let i26_class_value;
    	let t108;
    	let a26_type_value;
    	let a26_data_toggle_value;
    	let a26_data_target_value;
    	let span15;
    	let div59_class_value;
    	let t110;
    	let div98;
    	let div97;
    	let t111;
    	let div88;
    	let div60;
    	let h50;
    	let i27;
    	let t112;
    	let a27;
    	let p3;
    	let t114;
    	let div61;
    	let h51;
    	let a28;
    	let t115;
    	let a29;
    	let p4;
    	let t117;
    	let div87;
    	let div86;
    	let div85;
    	let div84;
    	let div83;
    	let div62;
    	let h52;
    	let a30;
    	let t118;
    	let a31;
    	let p5;
    	let t120;
    	let div65;
    	let div64;
    	let div63;
    	let h53;
    	let i28;
    	let t121;
    	let a32;
    	let p6;
    	let t123;
    	let div69;
    	let div66;
    	let h54;
    	let a33;
    	let t124;
    	let a34;
    	let p7;
    	let t126;
    	let div68;
    	let div67;
    	let h55;
    	let i29;
    	let t127;
    	let a35;
    	let p8;
    	let t129;
    	let div82;
    	let div70;
    	let h56;
    	let a36;
    	let t130;
    	let a37;
    	let p9;
    	let t132;
    	let div81;
    	let div80;
    	let div79;
    	let div78;
    	let div74;
    	let div71;
    	let h57;
    	let a38;
    	let t133;
    	let a39;
    	let p10;
    	let t135;
    	let div73;
    	let div72;
    	let h58;
    	let i30;
    	let t136;
    	let a40;
    	let p11;
    	let t138;
    	let div75;
    	let h59;
    	let i31;
    	let t139;
    	let a41;
    	let p12;
    	let t141;
    	let div77;
    	let div76;
    	let t143;
    	let div92;
    	let div89;
    	let h510;
    	let a42;
    	let t144;
    	let a43;
    	let p13;
    	let t146;
    	let div91;
    	let div90;
    	let h511;
    	let i32;
    	let t147;
    	let a44;
    	let p14;
    	let t149;
    	let div96;
    	let div93;
    	let h512;
    	let a45;
    	let t150;
    	let a46;
    	let p15;
    	let t152;
    	let div95;
    	let div94;
    	let h513;
    	let i33;
    	let t153;
    	let a47;
    	let p16;
    	let div97_class_value;
    	let div97_role_value;
    	let div98_class_value;
    	let div98_id_value;
    	let div98_tabindex_value;
    	let div98_role_value;
    	let div99_class_value;
    	let t155;
    	let div122;
    	let div121;
    	let div117;
    	let div116;
    	let h514;
    	let t157;
    	let p17;
    	let t159;
    	let div115;
    	let div114;
    	let div102;
    	let t161;
    	let div103;
    	let a48;
    	let t163;
    	let div104;
    	let t165;
    	let div105;
    	let t167;
    	let div106;
    	let t169;
    	let div107;
    	let t171;
    	let div108;
    	let t173;
    	let div109;
    	let t175;
    	let div110;
    	let t177;
    	let div111;
    	let t179;
    	let div112;
    	let t181;
    	let div113;
    	let t183;
    	let div120;
    	let div119;
    	let h515;
    	let t185;
    	let p18;
    	let t187;
    	let div118;
    	let main_transition;
    	let t188;
    	let br0;
    	let br1;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*y*/ ctx[1] > 600 && create_if_block_1$1(ctx);
    	let if_block1 = /*x*/ ctx[0] <= 767 && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			main = element("main");
    			div124 = element("div");
    			aside0 = element("aside");
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			a0 = element("a");
    			img0 = element("img");
    			t1 = space();
    			aside3 = element("aside");
    			div16 = element("div");
    			div15 = element("div");
    			div14 = element("div");
    			div4 = element("div");
    			img1 = element("img");
    			t2 = space();
    			div5 = element("div");
    			img2 = element("img");
    			t3 = space();
    			div11 = element("div");
    			div10 = element("div");
    			div9 = element("div");
    			h30 = element("h3");
    			t4 = text("آفرینه ");
    			i0 = element("i");
    			t5 = space();
    			h60 = element("h6");
    			i1 = element("i");
    			t6 = text(" تهران,شهرک طالقانی,ساحتمان نگین");
    			t7 = space();
    			h61 = element("h6");
    			h61.textContent = "به آفرینه محلق شوید و بروز باشید.میتوانید مطالب مرتبط به کارآفرینی و بازاریابی رو از اینجا دنبال کنید اگر از محتوای ما خوشتان اومد آنرابا دیگران به اشتراک بگذارید.";
    			t9 = space();
    			div8 = element("div");
    			div7 = element("div");
    			button0 = element("button");
    			i2 = element("i");
    			t10 = text("بازدید سایت");
    			t11 = space();
    			div6 = element("div");
    			button1 = element("button");
    			button1.textContent = "بیشتر";
    			t13 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			a1 = element("a");
    			i3 = element("i");
    			t14 = text(" اشتراک صفحه");
    			t15 = space();
    			li1 = element("li");
    			a2 = element("a");
    			i4 = element("i");
    			t16 = text(" گزارش دادن");
    			t17 = space();
    			div13 = element("div");
    			div12 = element("div");
    			ul1 = element("ul");
    			li2 = element("li");
    			a3 = element("a");
    			a3.textContent = "پست";
    			t19 = space();
    			li3 = element("li");
    			a4 = element("a");
    			a4.textContent = "درباره";
    			t21 = space();
    			div123 = element("div");
    			div101 = element("div");
    			div100 = element("div");
    			aside1 = element("aside");
    			section = element("section");
    			div56 = element("div");
    			article0 = element("article");
    			div24 = element("div");
    			div23 = element("div");
    			div21 = element("div");
    			div20 = element("div");
    			div17 = element("div");
    			img3 = element("img");
    			t22 = space();
    			div19 = element("div");
    			div18 = element("div");
    			h62 = element("h6");
    			a5 = element("a");
    			t23 = text("مرکز رشد و نواوری آفرینه ");
    			i5 = element("i");
    			t24 = space();
    			span0 = element("span");
    			i6 = element("i");
    			t25 = text(" ۳ دقیقه قبل");
    			t26 = space();
    			div22 = element("div");
    			i7 = element("i");
    			t27 = space();
    			ul2 = element("ul");
    			li4 = element("li");
    			a6 = element("a");
    			i8 = element("i");
    			t28 = text(" ذخیره کردن پست");
    			t29 = space();
    			li5 = element("li");
    			a7 = element("a");
    			i9 = element("i");
    			t30 = text(" کپی کردن لینک");
    			t31 = space();
    			li6 = element("li");
    			a8 = element("a");
    			i10 = element("i");
    			t32 = text(" گزارش دادن");
    			t33 = space();
    			div25 = element("div");
    			h31 = element("h3");
    			a9 = element("a");
    			a9.textContent = "به اینولینکس خوش آمدید";
    			t35 = space();
    			div26 = element("div");
    			img4 = element("img");
    			t36 = space();
    			p0 = element("p");
    			span1 = element("span");
    			span1.textContent = "طراحان سایت هنگام طراحی قالب سایت معمولا با این موضوع رو برو هستند که محتوای اصلی صفحات آماده نیست. در نتیجه طرح کلی دید درستی به کار فرما نمیدهد. اگر طراح بخواهد دنبال متن های مرتبط بگردد تمرکزش از روی کار اصلی برداشته میشود و اینکار زمان بر خواهد بود. همچنین طراح به دنبال این است که پس از ارایه کار نظر دیگران را در مورد طراحی جویا شود و نمی‌خواهد افراد روی متن های موجود تمرکز کنند.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n            نکته بعدی در مورد متن ساختگی لورم ایپسوم این است که بعضی از طراحان وبسایت و گرافیست کاران بعد از آنکه قالب و محتوای مورد نظرشون را ایجاد کردند از یاد می‌برند که متن لورم را از قسمتهای مختلف .";
    			t38 = space();
    			span2 = element("span");
    			span2.textContent = "بیشتر بخوانید";
    			t40 = space();
    			span3 = element("span");
    			div27 = element("div");
    			a10 = element("a");
    			button2 = element("button");
    			button2.textContent = "ادامه مطلب";
    			t42 = space();
    			div29 = element("div");
    			a11 = element("a");
    			img5 = element("img");
    			t43 = space();
    			span4 = element("span");
    			span4.textContent = "مسعودآقایی ساداتی";
    			t45 = text("  ");
    			t46 = space();
    			div28 = element("div");
    			i11 = element("i");
    			t47 = text(" ۵۶");
    			t48 = space();
    			article1 = element("article");
    			div37 = element("div");
    			div36 = element("div");
    			div34 = element("div");
    			div33 = element("div");
    			div30 = element("div");
    			img6 = element("img");
    			t49 = space();
    			div32 = element("div");
    			div31 = element("div");
    			h63 = element("h6");
    			a12 = element("a");
    			t50 = text("مرکز رشد و نواوری آفرینه ");
    			i12 = element("i");
    			t51 = space();
    			span5 = element("span");
    			i13 = element("i");
    			t52 = text(" ۳ دقیقه قبل");
    			t53 = space();
    			div35 = element("div");
    			i14 = element("i");
    			t54 = space();
    			ul3 = element("ul");
    			li7 = element("li");
    			a13 = element("a");
    			i15 = element("i");
    			t55 = text(" ذخیره کردن پست");
    			t56 = space();
    			li8 = element("li");
    			a14 = element("a");
    			i16 = element("i");
    			t57 = text(" کپی کردن لینک");
    			t58 = space();
    			li9 = element("li");
    			a15 = element("a");
    			i17 = element("i");
    			t59 = text(" گزارش دادن");
    			t60 = space();
    			div38 = element("div");
    			h32 = element("h3");
    			a16 = element("a");
    			a16.textContent = "به اینولینکس خوش آمدید";
    			t62 = space();
    			div39 = element("div");
    			img7 = element("img");
    			t63 = space();
    			p1 = element("p");
    			span6 = element("span");
    			span6.textContent = "طراحان سایت هنگام طراحی قالب سایت معمولا با این موضوع رو برو هستند که محتوای اصلی صفحات آماده نیست. در نتیجه طرح کلی دید درستی به کار فرما نمیدهد. اگر طراح بخواهد دنبال متن های مرتبط بگردد تمرکزش از روی کار اصلی برداشته میشود و اینکار زمان بر خواهد بود. همچنین طراح به دنبال این است که پس از ارایه کار نظر دیگران را در مورد طراحی جویا شود و نمی‌خواهد افراد روی متن های موجود تمرکز کنند.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n            نکته بعدی در مورد متن ساختگی لورم ایپسوم این است که بعضی از طراحان وبسایت و گرافیست کاران بعد از آنکه قالب و محتوای مورد نظرشون را ایجاد کردند از یاد می‌برند که متن لورم را از قسمتهای مختلف .";
    			t65 = space();
    			span7 = element("span");
    			span7.textContent = "بیشتر بخوانید";
    			t67 = space();
    			span8 = element("span");
    			div40 = element("div");
    			a17 = element("a");
    			button3 = element("button");
    			button3.textContent = "ادامه مطلب";
    			t69 = space();
    			div42 = element("div");
    			a18 = element("a");
    			img8 = element("img");
    			t70 = space();
    			span9 = element("span");
    			span9.textContent = "مسعودآقایی ساداتی";
    			t72 = text("  ");
    			t73 = space();
    			div41 = element("div");
    			i18 = element("i");
    			t74 = text(" ۵۶");
    			t75 = space();
    			article2 = element("article");
    			div50 = element("div");
    			div49 = element("div");
    			div47 = element("div");
    			div46 = element("div");
    			div43 = element("div");
    			img9 = element("img");
    			t76 = space();
    			div45 = element("div");
    			div44 = element("div");
    			h64 = element("h6");
    			a19 = element("a");
    			t77 = text("مرکز رشد و نواوری آفرینه ");
    			i19 = element("i");
    			t78 = space();
    			span10 = element("span");
    			i20 = element("i");
    			t79 = text(" ۳ دقیقه قبل");
    			t80 = space();
    			div48 = element("div");
    			i21 = element("i");
    			t81 = space();
    			ul4 = element("ul");
    			li10 = element("li");
    			a20 = element("a");
    			i22 = element("i");
    			t82 = text(" ذخیره کردن پست");
    			t83 = space();
    			li11 = element("li");
    			a21 = element("a");
    			i23 = element("i");
    			t84 = text(" کپی کردن لینک");
    			t85 = space();
    			li12 = element("li");
    			a22 = element("a");
    			i24 = element("i");
    			t86 = text(" گزارش دادن");
    			t87 = space();
    			div51 = element("div");
    			h33 = element("h3");
    			a23 = element("a");
    			a23.textContent = "به اینولینکس خوش آمدید";
    			t89 = space();
    			div52 = element("div");
    			img10 = element("img");
    			t90 = space();
    			p2 = element("p");
    			span11 = element("span");
    			span11.textContent = "طراحان سایت هنگام طراحی قالب سایت معمولا با این موضوع رو برو هستند که محتوای اصلی صفحات آماده نیست. در نتیجه طرح کلی دید درستی به کار فرما نمیدهد. اگر طراح بخواهد دنبال متن های مرتبط بگردد تمرکزش از روی کار اصلی برداشته میشود و اینکار زمان بر خواهد بود. همچنین طراح به دنبال این است که پس از ارایه کار نظر دیگران را در مورد طراحی جویا شود و نمی‌خواهد افراد روی متن های موجود تمرکز کنند.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n            نکته بعدی در مورد متن ساختگی لورم ایپسوم این است که بعضی از طراحان وبسایت و گرافیست کاران بعد از آنکه قالب و محتوای مورد نظرشون را ایجاد کردند از یاد می‌برند که متن لورم را از قسمتهای مختلف .";
    			t92 = space();
    			span12 = element("span");
    			span12.textContent = "بیشتر بخوانید";
    			t94 = space();
    			span13 = element("span");
    			div53 = element("div");
    			a24 = element("a");
    			button4 = element("button");
    			button4.textContent = "ادامه مطلب";
    			t96 = space();
    			div55 = element("div");
    			a25 = element("a");
    			img11 = element("img");
    			t97 = space();
    			span14 = element("span");
    			span14.textContent = "مسعودآقایی ساداتی";
    			t99 = text("  ");
    			t100 = space();
    			div54 = element("div");
    			i25 = element("i");
    			t101 = text(" ۵۶");
    			t102 = space();
    			aside2 = element("aside");
    			div58 = element("div");
    			div57 = element("div");
    			img12 = element("img");
    			t103 = space();
    			h34 = element("h3");
    			h34.textContent = "آفرینه";
    			t105 = space();
    			h65 = element("h6");
    			h65.textContent = "زندگی به سبک نوآوری";
    			t107 = space();
    			div99 = element("div");
    			div59 = element("div");
    			a26 = element("a");
    			i26 = element("i");
    			t108 = space();
    			span15 = element("span");
    			span15.textContent = "دسته بندی";
    			t110 = space();
    			div98 = element("div");
    			div97 = element("div");
    			if (if_block1) if_block1.c();
    			t111 = space();
    			div88 = element("div");
    			div60 = element("div");
    			h50 = element("h5");
    			i27 = element("i");
    			t112 = space();
    			a27 = element("a");
    			p3 = element("p");
    			p3.textContent = "همه";
    			t114 = space();
    			div61 = element("div");
    			h51 = element("h5");
    			a28 = element("a");
    			t115 = space();
    			a29 = element("a");
    			p4 = element("p");
    			p4.textContent = "بازاریابی";
    			t117 = space();
    			div87 = element("div");
    			div86 = element("div");
    			div85 = element("div");
    			div84 = element("div");
    			div83 = element("div");
    			div62 = element("div");
    			h52 = element("h5");
    			a30 = element("a");
    			t118 = space();
    			a31 = element("a");
    			p5 = element("p");
    			p5.textContent = "کسب و کار";
    			t120 = space();
    			div65 = element("div");
    			div64 = element("div");
    			div63 = element("div");
    			h53 = element("h5");
    			i28 = element("i");
    			t121 = space();
    			a32 = element("a");
    			p6 = element("p");
    			p6.textContent = "ورزش";
    			t123 = space();
    			div69 = element("div");
    			div66 = element("div");
    			h54 = element("h5");
    			a33 = element("a");
    			t124 = space();
    			a34 = element("a");
    			p7 = element("p");
    			p7.textContent = "مدیریت تکنولوژی";
    			t126 = space();
    			div68 = element("div");
    			div67 = element("div");
    			h55 = element("h5");
    			i29 = element("i");
    			t127 = space();
    			a35 = element("a");
    			p8 = element("p");
    			p8.textContent = "خاورمیانه";
    			t129 = space();
    			div82 = element("div");
    			div70 = element("div");
    			h56 = element("h5");
    			a36 = element("a");
    			t130 = space();
    			a37 = element("a");
    			p9 = element("p");
    			p9.textContent = "آرشیو کلیپ ها";
    			t132 = space();
    			div81 = element("div");
    			div80 = element("div");
    			div79 = element("div");
    			div78 = element("div");
    			div74 = element("div");
    			div71 = element("div");
    			h57 = element("h5");
    			a38 = element("a");
    			t133 = space();
    			a39 = element("a");
    			p10 = element("p");
    			p10.textContent = "کسب و کار";
    			t135 = space();
    			div73 = element("div");
    			div72 = element("div");
    			h58 = element("h5");
    			i30 = element("i");
    			t136 = space();
    			a40 = element("a");
    			p11 = element("p");
    			p11.textContent = "فوتبال";
    			t138 = space();
    			div75 = element("div");
    			h59 = element("h5");
    			i31 = element("i");
    			t139 = space();
    			a41 = element("a");
    			p12 = element("p");
    			p12.textContent = "خاورمیانه";
    			t141 = space();
    			div77 = element("div");
    			div76 = element("div");
    			div76.textContent = "خاورمیانه";
    			t143 = space();
    			div92 = element("div");
    			div89 = element("div");
    			h510 = element("h5");
    			a42 = element("a");
    			t144 = space();
    			a43 = element("a");
    			p13 = element("p");
    			p13.textContent = "مدیریت تلکنولوژی";
    			t146 = space();
    			div91 = element("div");
    			div90 = element("div");
    			h511 = element("h5");
    			i32 = element("i");
    			t147 = space();
    			a44 = element("a");
    			p14 = element("p");
    			p14.textContent = "خاورمیانه";
    			t149 = space();
    			div96 = element("div");
    			div93 = element("div");
    			h512 = element("h5");
    			a45 = element("a");
    			t150 = space();
    			a46 = element("a");
    			p15 = element("p");
    			p15.textContent = "آرشیو کلیپ ها";
    			t152 = space();
    			div95 = element("div");
    			div94 = element("div");
    			h513 = element("h5");
    			i33 = element("i");
    			t153 = space();
    			a47 = element("a");
    			p16 = element("p");
    			p16.textContent = "راهیان نور";
    			t155 = space();
    			div122 = element("div");
    			div121 = element("div");
    			div117 = element("div");
    			div116 = element("div");
    			h514 = element("h5");
    			h514.textContent = "درباره آفرینه";
    			t157 = space();
    			p17 = element("p");
    			p17.textContent = "لورم ایپسوم یک متن ساختگی برای طراحی و نمایش محتوای بی ربط است اما این متن نوشته شده هیچ ربطی به لورم ایپسوم ندارد.\n                                    این چیزی که میبینید صرفا یک متن ساختگی تر نسبت به لورم ایپسوم است تا شما بتواندی با گرفتن خروجی در سایت و موبایل یا هر دستگاه دیگر خروجی بگیرید و نگاه کنید که ساختار کد نوشتاری سایت با لورم به چه صورتی در آمده است.\n                                    با تشکر از سایت ساختگی نوشتار لورم ایپسوم آقای بوق";
    			t159 = space();
    			div115 = element("div");
    			div114 = element("div");
    			div102 = element("div");
    			div102.textContent = "وبسایت";
    			t161 = space();
    			div103 = element("div");
    			a48 = element("a");
    			a48.textContent = "http://afarine.com/";
    			t163 = space();
    			div104 = element("div");
    			div104.textContent = "نوع فعالیت";
    			t165 = space();
    			div105 = element("div");
    			div105.textContent = "کارآفرینی و کسب و کار - خصوصی";
    			t167 = space();
    			div106 = element("div");
    			div106.textContent = "میزان استخدام";
    			t169 = space();
    			div107 = element("div");
    			div107.textContent = "۱۲۰ + کارمند";
    			t171 = space();
    			div108 = element("div");
    			div108.textContent = "تاریخ تاسیس";
    			t173 = space();
    			div109 = element("div");
    			div109.textContent = "۲۰۱۸";
    			t175 = space();
    			div110 = element("div");
    			div110.textContent = "تخصص ها";
    			t177 = space();
    			div111 = element("div");
    			div111.textContent = "اشتغال/بازاریابی/کسب و کار/";
    			t179 = space();
    			div112 = element("div");
    			div112.textContent = "آدرس اصلی";
    			t181 = space();
    			div113 = element("div");
    			div113.textContent = "تهران,شهرک طالقانی,ساحتمان نگین";
    			t183 = space();
    			div120 = element("div");
    			div119 = element("div");
    			h515 = element("h5");
    			h515.textContent = "موقعیت مکانی آفرینه";
    			t185 = space();
    			p18 = element("p");
    			p18.textContent = "برای یافتن مکان دقیق باید زوم کنید";
    			t187 = space();
    			div118 = element("div");
    			t188 = space();
    			br0 = element("br");
    			br1 = element("br");
    			attr_dev(img0, "class", "w-100 dream-job-image");
    			if (img0.src !== (img0_src_value = "image/job.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$5, 98, 32, 4124);
    			attr_dev(a0, "href", "#");
    			add_location(a0, file$5, 97, 28, 4079);
    			attr_dev(div0, "class", "col-12 my-1");
    			add_location(div0, file$5, 96, 24, 4025);
    			attr_dev(div1, "class", "row ");
    			add_location(div1, file$5, 95, 20, 3982);
    			attr_dev(div2, "class", "col-12 shadow-radius-section bg-light");
    			add_location(div2, file$5, 94, 16, 3910);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file$5, 93, 12, 3876);
    			attr_dev(aside0, "class", "col-12 col-md-3 mr-2 d-none d-lg-inline");
    			add_location(aside0, file$5, 92, 8, 3807);
    			attr_dev(img1, "class", " header-image bg-light");
    			if (img1.src !== (img1_src_value = "image/head.jpeg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$5, 110, 28, 4640);
    			attr_dev(div4, "class", "col-12 p-0 banner");
    			set_style(div4, "overflow", "hidden");
    			add_location(div4, file$5, 109, 24, 4554);
    			attr_dev(img2, "class", "header-logo-image");
    			if (img2.src !== (img2_src_value = "image/afarine.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$5, 113, 28, 4828);
    			attr_dev(div5, "class", "col-12 header-image-main");
    			add_location(div5, file$5, 112, 24, 4761);
    			set_style(i0, "color", "#048af7");
    			set_style(i0, "font-size", "20px");
    			attr_dev(i0, "class", "fas fa-check-circle");
    			add_location(i0, file$5, 118, 85, 5165);
    			attr_dev(h30, "class", "text-bold text-font-size");
    			add_location(h30, file$5, 118, 36, 5116);
    			attr_dev(i1, "class", "fas fa-map-marker-alt");
    			add_location(i1, file$5, 119, 63, 5308);
    			attr_dev(h60, "class", "text-secondary");
    			add_location(h60, file$5, 119, 36, 5281);
    			attr_dev(h61, "class", "explain-about-page");
    			add_location(h61, file$5, 120, 36, 5424);
    			attr_dev(i2, "class", "fas fa-external-link-alt padding-button ml-2 icon-size");
    			add_location(i2, file$5, 123, 129, 5888);
    			attr_dev(button0, "class", "btn rounded-pill mb-1 font btn-mw text-center visit-btn mx-0 mx-sm-1");
    			add_location(button0, file$5, 123, 44, 5803);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "data-toggle", "dropdown");
    			attr_dev(button1, "class", "pt-custome-more-btn btn btn-mw rounded-pill col-12 font text-center col-md-6 mr-2");
    			add_location(button1, file$5, 125, 48, 6145);
    			attr_dev(i3, "class", "fas fa-share-alt");
    			add_location(i3, file$5, 127, 68, 6453);
    			attr_dev(a1, "href", "#");
    			add_location(a1, file$5, 127, 56, 6441);
    			add_location(li0, file$5, 127, 52, 6437);
    			attr_dev(i4, "class", "fas fa-flag");
    			add_location(i4, file$5, 128, 68, 6576);
    			attr_dev(a2, "href", "#");
    			add_location(a2, file$5, 128, 56, 6564);
    			add_location(li1, file$5, 128, 52, 6560);
    			attr_dev(ul0, "class", "dropdown-menu  ellipsis-menu");
    			add_location(ul0, file$5, 126, 48, 6343);
    			attr_dev(div6, "class", "col-12 col-md-3 justify-content-start navbar dropleft pr-1");
    			add_location(div6, file$5, 124, 44, 6024);
    			attr_dev(div7, "class", "row vm-navbar");
    			add_location(div7, file$5, 122, 40, 5731);
    			attr_dev(div8, "class", "col-12 mt-4 font");
    			add_location(div8, file$5, 121, 36, 5660);
    			attr_dev(div9, "class", "col-10");
    			add_location(div9, file$5, 117, 32, 5059);
    			attr_dev(div10, "class", "row");
    			add_location(div10, file$5, 116, 28, 5009);
    			attr_dev(div11, "class", "header-detail col-12");
    			add_location(div11, file$5, 115, 24, 4946);
    			attr_dev(a3, "class", "py-2 nav-link-scroll");
    			attr_dev(a3, "data-toggle", "tab");
    			attr_dev(a3, "href", "#post");
    			toggle_class(a3, "active", /*current*/ ctx[3] === "post");
    			add_location(a3, file$5, 141, 73, 7307);
    			attr_dev(li2, "class", "nav-item-scroll mt-2");
    			add_location(li2, file$5, 141, 40, 7274);
    			attr_dev(a4, "class", "py-2 nav-link-scroll");
    			attr_dev(a4, "data-toggle", "tab");
    			attr_dev(a4, "href", "#about");
    			toggle_class(a4, "active", /*current*/ ctx[3] === "about");
    			add_location(a4, file$5, 142, 73, 7525);
    			attr_dev(li3, "class", "nav-item-scroll mt-2");
    			add_location(li3, file$5, 142, 40, 7492);
    			attr_dev(ul1, "class", "nav nav-tabs direction text-center");
    			attr_dev(ul1, "role", "tablist");
    			add_location(ul1, file$5, 140, 36, 7171);
    			attr_dev(div12, "class", "row  scroll-main-height");
    			add_location(div12, file$5, 139, 32, 7097);
    			attr_dev(div13, "class", "col-12 tab-header-main mt-3 ");
    			add_location(div13, file$5, 138, 28, 7022);
    			attr_dev(div14, "class", "row p-0 shadow-radius-section bg-white");
    			add_location(div14, file$5, 108, 20, 4476);
    			attr_dev(div15, "class", "col-12 ");
    			add_location(div15, file$5, 107, 16, 4434);
    			attr_dev(div16, "class", "row ml-md-1 ");
    			add_location(div16, file$5, 106, 12, 4391);
    			attr_dev(img3, "class", "cu-image-com mr-1 ");
    			if (img3.src !== (img3_src_value = "image/afarine.jpg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "");
    			add_location(img3, file$5, 163, 60, 8952);
    			attr_dev(div17, "class", "col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width");
    			add_location(div17, file$5, 162, 56, 8822);
    			set_style(i5, "color", "#048af7");
    			attr_dev(i5, "class", "fas fa-check-circle");
    			add_location(i5, file$5, 167, 141, 9487);
    			attr_dev(a5, "href", "magezine");
    			attr_dev(a5, "class", "title-post-link");
    			add_location(a5, file$5, 167, 68, 9414);
    			add_location(h62, file$5, 167, 64, 9410);
    			attr_dev(i6, "class", "fas fa-clock");
    			add_location(i6, file$5, 168, 96, 9651);
    			attr_dev(span0, "class", "show-time-custome");
    			add_location(span0, file$5, 168, 64, 9619);
    			attr_dev(div18, "class", "cu-intro mt-2");
    			add_location(div18, file$5, 166, 60, 9318);
    			attr_dev(div19, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-0 pr-md-4 mr-lg-2 mr-xl-0 pr-xl-3 justify-content-center custome-margin-right ");
    			add_location(div19, file$5, 165, 56, 9135);
    			attr_dev(div20, "class", "row ");
    			add_location(div20, file$5, 161, 52, 8747);
    			attr_dev(div21, "class", "col-11 col-md-11");
    			add_location(div21, file$5, 160, 48, 8663);
    			attr_dev(i7, "class", "fas fa-ellipsis-h -1 ");
    			attr_dev(i7, "type", "button");
    			attr_dev(i7, "data-toggle", "dropdown");
    			add_location(i7, file$5, 175, 52, 10174);
    			attr_dev(i8, "class", "far fa-bookmark");
    			add_location(i8, file$5, 177, 136, 10478);
    			attr_dev(a6, "class", "dropdown-item");
    			attr_dev(a6, "href", "#");
    			add_location(a6, file$5, 177, 101, 10443);
    			add_location(li4, file$5, 177, 56, 10398);
    			attr_dev(i9, "class", "fas fa-share-alt");
    			add_location(i9, file$5, 178, 94, 10629);
    			attr_dev(a7, "class", "dropdown-item");
    			attr_dev(a7, "href", "#");
    			add_location(a7, file$5, 178, 60, 10595);
    			add_location(li5, file$5, 178, 56, 10591);
    			attr_dev(i10, "class", "fas fa-flag");
    			add_location(i10, file$5, 179, 94, 10780);
    			attr_dev(a8, "class", "dropdown-item");
    			attr_dev(a8, "href", "#");
    			add_location(a8, file$5, 179, 60, 10746);
    			add_location(li6, file$5, 179, 56, 10742);
    			attr_dev(ul2, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul2, file$5, 176, 52, 10301);
    			attr_dev(div22, "class", "report col-1 ml-0 pl-0 pr-3 navbar pr-sm-4 pr-md-3 pr-lg-3 pr-xl-4 ");
    			add_location(div22, file$5, 174, 48, 10040);
    			attr_dev(div23, "class", "row justify-content-between p-2 pl-4 pl-md-2");
    			add_location(div23, file$5, 159, 44, 8556);
    			attr_dev(div24, "class", "col-12");
    			add_location(div24, file$5, 158, 40, 8491);
    			attr_dev(a9, "class", "title-post-link");
    			attr_dev(a9, "href", "magezine/show-detail");
    			add_location(a9, file$5, 186, 88, 11233);
    			attr_dev(h31, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h31, file$5, 186, 44, 11189);
    			attr_dev(div25, "class", "col-12 p-0");
    			add_location(div25, file$5, 185, 40, 11120);
    			if (img4.src !== (img4_src_value = "image/30.jpg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img4, "alt", "");
    			add_location(img4, file$5, 189, 44, 11509);
    			attr_dev(div26, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div26, file$5, 188, 40, 11407);
    			attr_dev(span1, "class", "content d-inline");
    			add_location(span1, file$5, 193, 44, 11808);
    			attr_dev(span2, "class", "read-more-custom");
    			attr_dev(span2, "onclick", "readMore(this)");
    			set_style(span2, "cursor", "pointer");
    			add_location(span2, file$5, 205, 44, 15332);
    			attr_dev(button2, "class", "btn btn-sm btn-danger col-12 my-1 p-1 offset-0 font-family");
    			add_location(button2, file$5, 209, 56, 15774);
    			attr_dev(a10, "href", "magezine/show-detail");
    			attr_dev(a10, "class", "col-3 col-md-2 px-0");
    			add_location(a10, file$5, 208, 52, 15658);
    			attr_dev(div27, "class", "row pl-0 ml-0 pt-2 justify-content-end ");
    			add_location(div27, file$5, 207, 48, 15552);
    			attr_dev(span3, "class", "read-more ");
    			add_location(span3, file$5, 206, 44, 15478);
    			attr_dev(p0, "class", "post-text col-12 mt-3 post-text");
    			add_location(p0, file$5, 192, 40, 11720);
    			attr_dev(img5, "class", "personal-img");
    			if (img5.src !== (img5_src_value = "image/1.jpeg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "");
    			add_location(img5, file$5, 219, 48, 16393);
    			attr_dev(span4, "class", "personal-name");
    			add_location(span4, file$5, 220, 48, 16494);
    			attr_dev(a11, "class", "a-clicked");
    			attr_dev(a11, "href", "profile");
    			add_location(a11, file$5, 218, 44, 16308);
    			attr_dev(i11, "class", "fas fa-eye");
    			add_location(i11, file$5, 222, 68, 16677);
    			attr_dev(div28, "class", "view-count");
    			add_location(div28, file$5, 222, 44, 16653);
    			attr_dev(div29, "class", "col-12 mb-1 author-show-box pt-1");
    			add_location(div29, file$5, 217, 40, 16217);
    			attr_dev(article0, "class", "p-0  shadow-radius-section shadow-section mb-4 bg-light");
    			add_location(article0, file$5, 157, 36, 8377);
    			attr_dev(img6, "class", "cu-image-com mr-1 ");
    			if (img6.src !== (img6_src_value = "image/afarine.jpg")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "alt", "");
    			add_location(img6, file$5, 231, 60, 17418);
    			attr_dev(div30, "class", "col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width");
    			add_location(div30, file$5, 230, 56, 17288);
    			set_style(i12, "color", "#048af7");
    			attr_dev(i12, "class", "fas fa-check-circle");
    			add_location(i12, file$5, 235, 141, 17953);
    			attr_dev(a12, "href", "magezine");
    			attr_dev(a12, "class", "title-post-link");
    			add_location(a12, file$5, 235, 68, 17880);
    			add_location(h63, file$5, 235, 64, 17876);
    			attr_dev(i13, "class", "fas fa-clock");
    			add_location(i13, file$5, 236, 96, 18117);
    			attr_dev(span5, "class", "show-time-custome");
    			add_location(span5, file$5, 236, 64, 18085);
    			attr_dev(div31, "class", "cu-intro mt-2");
    			add_location(div31, file$5, 234, 60, 17784);
    			attr_dev(div32, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-0 pr-md-4 mr-lg-2 mr-xl-0 pr-xl-3 justify-content-center custome-margin-right ");
    			add_location(div32, file$5, 233, 56, 17601);
    			attr_dev(div33, "class", "row ");
    			add_location(div33, file$5, 229, 52, 17213);
    			attr_dev(div34, "class", "col-11 col-md-11");
    			add_location(div34, file$5, 228, 48, 17129);
    			attr_dev(i14, "class", "fas fa-ellipsis-h -1 ");
    			attr_dev(i14, "type", "button");
    			attr_dev(i14, "data-toggle", "dropdown");
    			add_location(i14, file$5, 243, 52, 18640);
    			attr_dev(i15, "class", "far fa-bookmark");
    			add_location(i15, file$5, 245, 136, 18944);
    			attr_dev(a13, "class", "dropdown-item");
    			attr_dev(a13, "href", "#");
    			add_location(a13, file$5, 245, 101, 18909);
    			add_location(li7, file$5, 245, 56, 18864);
    			attr_dev(i16, "class", "fas fa-share-alt");
    			add_location(i16, file$5, 246, 94, 19095);
    			attr_dev(a14, "class", "dropdown-item");
    			attr_dev(a14, "href", "#");
    			add_location(a14, file$5, 246, 60, 19061);
    			add_location(li8, file$5, 246, 56, 19057);
    			attr_dev(i17, "class", "fas fa-flag");
    			add_location(i17, file$5, 247, 94, 19246);
    			attr_dev(a15, "class", "dropdown-item");
    			attr_dev(a15, "href", "#");
    			add_location(a15, file$5, 247, 60, 19212);
    			add_location(li9, file$5, 247, 56, 19208);
    			attr_dev(ul3, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul3, file$5, 244, 52, 18767);
    			attr_dev(div35, "class", "report col-1 ml-0 pl-0 pr-3 navbar pr-sm-4 pr-md-3 pr-lg-3 pr-xl-4 ");
    			add_location(div35, file$5, 242, 48, 18506);
    			attr_dev(div36, "class", "row justify-content-between p-2 pl-4 pl-md-2");
    			add_location(div36, file$5, 227, 44, 17022);
    			attr_dev(div37, "class", "col-12");
    			add_location(div37, file$5, 226, 40, 16957);
    			attr_dev(a16, "class", "title-post-link");
    			attr_dev(a16, "href", "magezine/show-detail");
    			add_location(a16, file$5, 254, 88, 19699);
    			attr_dev(h32, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h32, file$5, 254, 44, 19655);
    			attr_dev(div38, "class", "col-12 p-0");
    			add_location(div38, file$5, 253, 40, 19586);
    			if (img7.src !== (img7_src_value = "image/30.jpg")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img7, "alt", "");
    			add_location(img7, file$5, 257, 44, 19975);
    			attr_dev(div39, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div39, file$5, 256, 40, 19873);
    			attr_dev(span6, "class", "content d-inline");
    			add_location(span6, file$5, 261, 44, 20274);
    			attr_dev(span7, "class", "read-more-custom");
    			attr_dev(span7, "onclick", "readMore(this)");
    			set_style(span7, "cursor", "pointer");
    			add_location(span7, file$5, 273, 44, 23798);
    			attr_dev(button3, "class", "btn btn-sm btn-danger col-12 my-1 p-1 offset-0 font-family");
    			add_location(button3, file$5, 277, 56, 24240);
    			attr_dev(a17, "href", "magezine/show-detail");
    			attr_dev(a17, "class", "col-3 col-md-2 px-0");
    			add_location(a17, file$5, 276, 52, 24124);
    			attr_dev(div40, "class", "row pl-0 ml-0 pt-2 justify-content-end ");
    			add_location(div40, file$5, 275, 48, 24018);
    			attr_dev(span8, "class", "read-more ");
    			add_location(span8, file$5, 274, 44, 23944);
    			attr_dev(p1, "class", "post-text col-12 mt-3 post-text");
    			add_location(p1, file$5, 260, 40, 20186);
    			attr_dev(img8, "class", "personal-img");
    			if (img8.src !== (img8_src_value = "image/1.jpeg")) attr_dev(img8, "src", img8_src_value);
    			attr_dev(img8, "alt", "");
    			add_location(img8, file$5, 287, 48, 24859);
    			attr_dev(span9, "class", "personal-name");
    			add_location(span9, file$5, 288, 48, 24960);
    			attr_dev(a18, "class", "a-clicked");
    			attr_dev(a18, "href", "profile");
    			add_location(a18, file$5, 286, 44, 24774);
    			attr_dev(i18, "class", "fas fa-eye");
    			add_location(i18, file$5, 290, 68, 25143);
    			attr_dev(div41, "class", "view-count");
    			add_location(div41, file$5, 290, 44, 25119);
    			attr_dev(div42, "class", "col-12 mb-1 author-show-box pt-1");
    			add_location(div42, file$5, 285, 40, 24683);
    			attr_dev(article1, "class", "p-0  shadow-radius-section shadow-section mb-4 bg-light");
    			add_location(article1, file$5, 225, 36, 16843);
    			attr_dev(img9, "class", "cu-image-com mr-1 ");
    			if (img9.src !== (img9_src_value = "image/afarine.jpg")) attr_dev(img9, "src", img9_src_value);
    			attr_dev(img9, "alt", "");
    			add_location(img9, file$5, 299, 60, 25884);
    			attr_dev(div43, "class", "col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width");
    			add_location(div43, file$5, 298, 56, 25754);
    			set_style(i19, "color", "#048af7");
    			attr_dev(i19, "class", "fas fa-check-circle");
    			add_location(i19, file$5, 303, 141, 26419);
    			attr_dev(a19, "href", "magezine");
    			attr_dev(a19, "class", "title-post-link");
    			add_location(a19, file$5, 303, 68, 26346);
    			add_location(h64, file$5, 303, 64, 26342);
    			attr_dev(i20, "class", "fas fa-clock");
    			add_location(i20, file$5, 304, 96, 26583);
    			attr_dev(span10, "class", "show-time-custome");
    			add_location(span10, file$5, 304, 64, 26551);
    			attr_dev(div44, "class", "cu-intro mt-2");
    			add_location(div44, file$5, 302, 60, 26250);
    			attr_dev(div45, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-0 pr-md-4 mr-lg-2 mr-xl-0 pr-xl-3 justify-content-center custome-margin-right ");
    			add_location(div45, file$5, 301, 56, 26067);
    			attr_dev(div46, "class", "row ");
    			add_location(div46, file$5, 297, 52, 25679);
    			attr_dev(div47, "class", "col-11 col-md-11");
    			add_location(div47, file$5, 296, 48, 25595);
    			attr_dev(i21, "class", "fas fa-ellipsis-h -1 ");
    			attr_dev(i21, "type", "button");
    			attr_dev(i21, "data-toggle", "dropdown");
    			add_location(i21, file$5, 311, 52, 27106);
    			attr_dev(i22, "class", "far fa-bookmark");
    			add_location(i22, file$5, 313, 136, 27410);
    			attr_dev(a20, "class", "dropdown-item");
    			attr_dev(a20, "href", "#");
    			add_location(a20, file$5, 313, 101, 27375);
    			add_location(li10, file$5, 313, 56, 27330);
    			attr_dev(i23, "class", "fas fa-share-alt");
    			add_location(i23, file$5, 314, 94, 27561);
    			attr_dev(a21, "class", "dropdown-item");
    			attr_dev(a21, "href", "#");
    			add_location(a21, file$5, 314, 60, 27527);
    			add_location(li11, file$5, 314, 56, 27523);
    			attr_dev(i24, "class", "fas fa-flag");
    			add_location(i24, file$5, 315, 94, 27712);
    			attr_dev(a22, "class", "dropdown-item");
    			attr_dev(a22, "href", "#");
    			add_location(a22, file$5, 315, 60, 27678);
    			add_location(li12, file$5, 315, 56, 27674);
    			attr_dev(ul4, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul4, file$5, 312, 52, 27233);
    			attr_dev(div48, "class", "report col-1 ml-0 pl-0 pr-3 navbar pr-sm-4 pr-md-3 pr-lg-3 pr-xl-4 ");
    			add_location(div48, file$5, 310, 48, 26972);
    			attr_dev(div49, "class", "row justify-content-between p-2 pl-4 pl-md-2");
    			add_location(div49, file$5, 295, 44, 25488);
    			attr_dev(div50, "class", "col-12");
    			add_location(div50, file$5, 294, 40, 25423);
    			attr_dev(a23, "class", "title-post-link");
    			attr_dev(a23, "href", "magezine/show-detail");
    			add_location(a23, file$5, 322, 88, 28165);
    			attr_dev(h33, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h33, file$5, 322, 44, 28121);
    			attr_dev(div51, "class", "col-12 p-0");
    			add_location(div51, file$5, 321, 40, 28052);
    			if (img10.src !== (img10_src_value = "image/30.jpg")) attr_dev(img10, "src", img10_src_value);
    			attr_dev(img10, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img10, "alt", "");
    			add_location(img10, file$5, 325, 44, 28441);
    			attr_dev(div52, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div52, file$5, 324, 40, 28339);
    			attr_dev(span11, "class", "content d-inline");
    			add_location(span11, file$5, 329, 44, 28740);
    			attr_dev(span12, "class", "read-more-custom");
    			attr_dev(span12, "onclick", "readMore(this)");
    			set_style(span12, "cursor", "pointer");
    			add_location(span12, file$5, 341, 44, 32264);
    			attr_dev(button4, "class", "btn btn-sm btn-danger col-12 my-1 p-1 offset-0 font-family");
    			add_location(button4, file$5, 345, 56, 32706);
    			attr_dev(a24, "href", "magezine/show-detail");
    			attr_dev(a24, "class", "col-3 col-md-2 px-0");
    			add_location(a24, file$5, 344, 52, 32590);
    			attr_dev(div53, "class", "row pl-0 ml-0 pt-2 justify-content-end ");
    			add_location(div53, file$5, 343, 48, 32484);
    			attr_dev(span13, "class", "read-more ");
    			add_location(span13, file$5, 342, 44, 32410);
    			attr_dev(p2, "class", "post-text col-12 mt-3 post-text");
    			add_location(p2, file$5, 328, 40, 28652);
    			attr_dev(img11, "class", "personal-img");
    			if (img11.src !== (img11_src_value = "image/1.jpeg")) attr_dev(img11, "src", img11_src_value);
    			attr_dev(img11, "alt", "");
    			add_location(img11, file$5, 355, 48, 33325);
    			attr_dev(span14, "class", "personal-name");
    			add_location(span14, file$5, 356, 48, 33426);
    			attr_dev(a25, "class", "a-clicked");
    			attr_dev(a25, "href", "profile");
    			add_location(a25, file$5, 354, 44, 33240);
    			attr_dev(i25, "class", "fas fa-eye");
    			add_location(i25, file$5, 358, 68, 33609);
    			attr_dev(div54, "class", "view-count");
    			add_location(div54, file$5, 358, 44, 33585);
    			attr_dev(div55, "class", "col-12 mb-1 author-show-box pt-1");
    			add_location(div55, file$5, 353, 40, 33149);
    			attr_dev(article2, "class", "p-0  shadow-radius-section shadow-section mb-4 bg-light");
    			add_location(article2, file$5, 293, 36, 25309);
    			attr_dev(div56, "class", "col-12 p-0 main-article ");
    			add_location(div56, file$5, 156, 32, 8302);
    			attr_dev(section, "class", "row mx-0 mt-3 mr-0 pt-0  ");
    			add_location(section, file$5, 155, 28, 8226);
    			attr_dev(aside1, "class", "col-12 col-md-9 order-first justify-content-between order-md-0 mx-0 ");
    			add_location(aside1, file$5, 154, 24, 8113);
    			attr_dev(img12, "class", "company-img  w-100");
    			if (img12.src !== (img12_src_value = "image/afarine.jpg")) attr_dev(img12, "src", img12_src_value);
    			attr_dev(img12, "alt", "");
    			add_location(img12, file$5, 367, 36, 34139);
    			attr_dev(div57, "class", "col-10 mx-auto mt-5 mb-3 ");
    			add_location(div57, file$5, 366, 32, 34063);
    			attr_dev(h34, "class", "col-12");
    			add_location(h34, file$5, 369, 32, 34274);
    			attr_dev(h65, "class", "col-12");
    			add_location(h65, file$5, 372, 32, 34407);
    			attr_dev(div58, "class", "row px-0 text-center shadow-radius-section bg-light ");
    			toggle_class(div58, "d-none", /*x*/ ctx[0] <= 767);
    			add_location(div58, file$5, 365, 28, 33942);

    			attr_dev(i26, "class", i26_class_value = "" + ((/*x*/ ctx[0] >= 767
    			? "fas fa-list-ul category-icon-modal"
    			: "fas fa-caret-left") + " "));

    			toggle_class(i26, "category-fixed-icon-modal", /*x*/ ctx[0] <= 767 && /*y*/ ctx[1] >= 400);
    			add_location(i26, file$5, 380, 40, 35105);
    			attr_dev(a26, "type", a26_type_value = /*x*/ ctx[0] <= 767 ? "button" : "");
    			attr_dev(a26, "class", "btn ");
    			attr_dev(a26, "data-toggle", a26_data_toggle_value = /*x*/ ctx[0] <= 767 ? "modal" : "");
    			attr_dev(a26, "data-target", a26_data_target_value = /*x*/ ctx[0] <= 767 ? "#mod2" : "");
    			add_location(a26, file$5, 379, 36, 34939);
    			attr_dev(span15, "class", "d-none d-md-inline");
    			add_location(span15, file$5, 381, 40, 35285);

    			attr_dev(div59, "class", div59_class_value = /*x*/ ctx[0] >= 767
    			? "col-12 font-weight-bold pb-2 border-bottom pr-0"
    			: "col-12 font-weight-bold");

    			add_location(div59, file$5, 377, 32, 34718);
    			attr_dev(i27, "class", "fas fa-dot-circle p-0 d-inline category_button-non");
    			add_location(i27, file$5, 397, 50, 36597);
    			attr_dev(p3, "class", "category-main-text d-inline");
    			add_location(p3, file$5, 399, 52, 36812);
    			attr_dev(a27, "href", "#");
    			attr_dev(a27, "class", "category-main-text-link");
    			add_location(a27, file$5, 398, 50, 36715);
    			attr_dev(h50, "class", "mb-0");
    			add_location(h50, file$5, 396, 48, 36529);
    			attr_dev(div60, "class", "border-bottom pb-2");
    			attr_dev(div60, "id", "");
    			add_location(div60, file$5, 395, 44, 36442);
    			attr_dev(a28, "class", "p-0 d-inline  category_button collapsed ");
    			attr_dev(a28, "data-toggle", "collapse");
    			attr_dev(a28, "data-target", "#collapseOne");
    			attr_dev(a28, "aria-expanded", "true");
    			attr_dev(a28, "aria-controls", "collapseOne");
    			add_location(a28, file$5, 405, 46, 37222);
    			attr_dev(p4, "class", "category-main-text d-inline");
    			add_location(p4, file$5, 407, 48, 37517);
    			attr_dev(a29, "href", "#");
    			attr_dev(a29, "class", "category-main-text-link");
    			add_location(a29, file$5, 406, 46, 37424);
    			attr_dev(h51, "class", "mb-0 mt-2");
    			add_location(h51, file$5, 404, 44, 37153);
    			attr_dev(div61, "class", "border-bottom pb-2");
    			attr_dev(div61, "id", "headingOne");
    			add_location(div61, file$5, 403, 42, 37060);
    			attr_dev(a30, "class", "p-0 d-inline category_button collapsed ");
    			attr_dev(a30, "data-toggle", "collapse");
    			attr_dev(a30, "data-target", "#collapseOneOne");
    			attr_dev(a30, "aria-expanded", "true");
    			attr_dev(a30, "aria-controls", "collapseOneOne");
    			add_location(a30, file$5, 418, 62, 38422);
    			attr_dev(p5, "class", "category-main-text d-inline");
    			add_location(p5, file$5, 420, 64, 38754);
    			attr_dev(a31, "href", "#");
    			attr_dev(a31, "class", "category-main-text-link");
    			add_location(a31, file$5, 419, 62, 38645);
    			attr_dev(h52, "class", "mb-0");
    			add_location(h52, file$5, 417, 60, 38342);
    			attr_dev(div62, "class", "border-bottom pb-2");
    			attr_dev(div62, "id", "headingOneOne");
    			add_location(div62, file$5, 416, 58, 38230);
    			attr_dev(i28, "class", "fas fa-dot-circle p-0 d-inline category_button-non");
    			add_location(i28, file$5, 428, 70, 39514);
    			attr_dev(p6, "class", "category-main-text d-inline");
    			add_location(p6, file$5, 430, 72, 39769);
    			attr_dev(a32, "href", "#");
    			attr_dev(a32, "class", "category-main-text-link");
    			add_location(a32, file$5, 429, 70, 39652);
    			attr_dev(h53, "class", "mb-0");
    			add_location(h53, file$5, 427, 68, 39426);
    			attr_dev(div63, "class", "border-bottom pb-2");
    			attr_dev(div63, "id", "");
    			add_location(div63, file$5, 426, 64, 39319);
    			attr_dev(div64, "class", "my-1 pl-2 ");
    			add_location(div64, file$5, 425, 60, 39230);
    			attr_dev(div65, "id", "collapseOneOne");
    			attr_dev(div65, "class", "collapse mr-3 ");
    			attr_dev(div65, "aria-labelledby", "headingOneOne");
    			attr_dev(div65, "data-parent", "#accordion1");
    			add_location(div65, file$5, 424, 58, 39063);
    			attr_dev(a33, "href", "#");
    			attr_dev(a33, "class", "p-0 d-inline category_button collapsed");
    			attr_dev(a33, "data-toggle", "collapse");
    			attr_dev(a33, "data-target", "#collapseTwoTwo");
    			attr_dev(a33, "aria-expanded", "false");
    			attr_dev(a33, "aria-controls", "collapseTwoTwo");
    			add_location(a33, file$5, 439, 62, 40496);
    			attr_dev(p7, "class", "category-main-text d-inline");
    			add_location(p7, file$5, 441, 64, 40837);
    			attr_dev(a34, "href", "#");
    			attr_dev(a34, "class", "category-main-text-link");
    			add_location(a34, file$5, 440, 62, 40728);
    			attr_dev(h54, "class", "mb-0");
    			add_location(h54, file$5, 438, 60, 40416);
    			attr_dev(div66, "class", "border-bottom pb-2");
    			attr_dev(div66, "id", "headingTwoTwo");
    			add_location(div66, file$5, 437, 58, 40304);
    			attr_dev(i29, "class", "fas fa-dot-circle p-0 d-inline category_button-non");
    			add_location(i29, file$5, 448, 66, 41505);
    			attr_dev(p8, "class", "category-main-text d-inline");
    			add_location(p8, file$5, 450, 68, 41752);
    			attr_dev(a35, "href", "#");
    			attr_dev(a35, "class", "category-main-text-link");
    			add_location(a35, file$5, 449, 66, 41639);
    			attr_dev(h55, "class", "mb-0");
    			add_location(h55, file$5, 447, 64, 41421);
    			attr_dev(div67, "class", "border-bottom py-2");
    			attr_dev(div67, "id", "");
    			add_location(div67, file$5, 446, 60, 41318);
    			attr_dev(div68, "id", "collapseTwoTwo");
    			attr_dev(div68, "class", "collapse mr-3");
    			attr_dev(div68, "aria-labelledby", "headingTwoTwo");
    			attr_dev(div68, "data-parent", "#accordion1");
    			add_location(div68, file$5, 445, 58, 41152);
    			attr_dev(div69, "class", "my-2 pl-2");
    			add_location(div69, file$5, 436, 56, 40222);
    			attr_dev(a36, "href", "#");
    			attr_dev(a36, "class", "p-0 d-inline category_button collapsed");
    			attr_dev(a36, "data-toggle", "collapse");
    			attr_dev(a36, "data-target", "#collapseThreeThree");
    			attr_dev(a36, "aria-expanded", "false");
    			attr_dev(a36, "aria-controls", "collapseThreeThree");
    			add_location(a36, file$5, 459, 62, 42476);
    			attr_dev(p9, "class", "category-main-text d-inline");
    			add_location(p9, file$5, 461, 64, 42825);
    			attr_dev(a37, "href", "#");
    			attr_dev(a37, "class", "category-main-text-link");
    			add_location(a37, file$5, 460, 62, 42716);
    			attr_dev(h56, "class", "mb-0");
    			add_location(h56, file$5, 458, 60, 42396);
    			attr_dev(div70, "class", "border-bottom pb-2");
    			attr_dev(div70, "id", "headingThreeThree");
    			add_location(div70, file$5, 457, 58, 42280);
    			attr_dev(a38, "class", "p-0 d-inline category_button collapsed ");
    			attr_dev(a38, "data-toggle", "collapse");
    			attr_dev(a38, "data-target", "#collapseOneOneOne");
    			attr_dev(a38, "aria-expanded", "true");
    			attr_dev(a38, "aria-controls", "collapseOneOneOne");
    			add_location(a38, file$5, 472, 78, 43927);
    			attr_dev(p10, "class", "category-main-text d-inline");
    			add_location(p10, file$5, 474, 80, 44297);
    			attr_dev(a39, "href", "#");
    			attr_dev(a39, "class", "category-main-text-link");
    			add_location(a39, file$5, 473, 78, 44172);
    			attr_dev(h57, "class", "mb-0");
    			add_location(h57, file$5, 471, 76, 43831);
    			attr_dev(div71, "class", "border-bottom pb-2");
    			attr_dev(div71, "id", "headingOneOneOne");
    			add_location(div71, file$5, 470, 74, 43700);
    			attr_dev(i30, "class", "fas fa-dot-circle p-0 d-inline category_button-non");
    			add_location(i30, file$5, 481, 82, 45078);
    			attr_dev(p11, "class", "category-main-text d-inline");
    			add_location(p11, file$5, 483, 84, 45357);
    			attr_dev(a40, "href", "#");
    			attr_dev(a40, "class", "category-main-text-link");
    			add_location(a40, file$5, 482, 82, 45228);
    			attr_dev(h58, "class", "mb-0");
    			add_location(h58, file$5, 480, 80, 44978);
    			attr_dev(div72, "class", "border-bottom py-2");
    			attr_dev(div72, "id", "");
    			add_location(div72, file$5, 479, 76, 44859);
    			attr_dev(div73, "id", "collapseOneOneOne");
    			attr_dev(div73, "class", "collapse mr-3 ");
    			attr_dev(div73, "aria-labelledby", "headingOneOneOne");
    			attr_dev(div73, "data-parent", "#accordion2");
    			add_location(div73, file$5, 478, 74, 44670);
    			attr_dev(div74, "class", "mb-2 pl-2");
    			add_location(div74, file$5, 469, 72, 43602);
    			attr_dev(i31, "class", "fas fa-dot-circle p-0 d-inline category_button-non");
    			add_location(i31, file$5, 491, 78, 46107);
    			attr_dev(p12, "class", "category-main-text d-inline");
    			add_location(p12, file$5, 493, 80, 46378);
    			attr_dev(a41, "href", "#");
    			attr_dev(a41, "class", "category-main-text-link");
    			add_location(a41, file$5, 492, 78, 46253);
    			attr_dev(h59, "class", "mb-0");
    			add_location(h59, file$5, 490, 76, 46011);
    			attr_dev(div75, "class", "border-bottom pb-2");
    			attr_dev(div75, "id", "");
    			add_location(div75, file$5, 489, 72, 45896);
    			attr_dev(div76, "class", "");
    			add_location(div76, file$5, 498, 76, 46938);
    			attr_dev(div77, "id", "collapseTwoTwoTwo");
    			attr_dev(div77, "class", "collapse mr-3");
    			attr_dev(div77, "aria-labelledby", "headingTwoTwoTwo");
    			attr_dev(div77, "data-parent", "#accordion2");
    			add_location(div77, file$5, 497, 74, 46750);
    			attr_dev(div78, "id", "accordion2");
    			add_location(div78, file$5, 468, 68, 43508);
    			attr_dev(div79, "class", " mt-2 mr-1 col-12 p-0 ");
    			add_location(div79, file$5, 467, 64, 43403);
    			attr_dev(div80, "class", "border-right");
    			add_location(div80, file$5, 466, 60, 43312);
    			attr_dev(div81, "id", "collapseThreeThree");
    			attr_dev(div81, "class", "collapse mr-3");
    			attr_dev(div81, "aria-labelledby", "headingThreeThree");
    			attr_dev(div81, "data-parent", "#accordion1");
    			add_location(div81, file$5, 465, 58, 43138);
    			attr_dev(div82, "class", "mb-2 pl-2");
    			add_location(div82, file$5, 456, 56, 42198);
    			attr_dev(div83, "class", "mb-2 pl-2");
    			add_location(div83, file$5, 415, 56, 38148);
    			attr_dev(div84, "id", "accordion1");
    			add_location(div84, file$5, 414, 52, 38070);
    			attr_dev(div85, "class", " mt-2 mr-1 col-12 p-0 ");
    			add_location(div85, file$5, 413, 48, 37981);
    			attr_dev(div86, "class", "border-right");
    			add_location(div86, file$5, 412, 44, 37906);
    			attr_dev(div87, "id", "collapseOne");
    			attr_dev(div87, "class", "collapse mr-3 ");
    			attr_dev(div87, "aria-labelledby", "headingOne");
    			attr_dev(div87, "data-parent", "#accordion");
    			add_location(div87, file$5, 411, 42, 37762);
    			attr_dev(div88, "class", "mb-2 pl-2 ");
    			add_location(div88, file$5, 394, 40, 36373);
    			attr_dev(a42, "href", "#");
    			attr_dev(a42, "class", "p-0 d-inline category_button collapsed");
    			attr_dev(a42, "data-toggle", "collapse");
    			attr_dev(a42, "data-target", "#collapseTwo");
    			attr_dev(a42, "aria-expanded", "false");
    			attr_dev(a42, "aria-controls", "collapseTwo");
    			add_location(a42, file$5, 516, 46, 48155);
    			attr_dev(p13, "class", "category-main-text d-inline");
    			add_location(p13, file$5, 518, 48, 48458);
    			attr_dev(a43, "href", "#");
    			attr_dev(a43, "class", "category-main-text-link");
    			add_location(a43, file$5, 517, 46, 48365);
    			attr_dev(h510, "class", "mb-0");
    			add_location(h510, file$5, 515, 44, 48091);
    			attr_dev(div89, "class", "border-bottom pb-2");
    			attr_dev(div89, "id", "headingTwo");
    			add_location(div89, file$5, 514, 42, 47998);
    			attr_dev(i32, "class", "fas fa-dot-circle p-0 d-inline category_button-non");
    			add_location(i32, file$5, 525, 50, 49008);
    			attr_dev(p14, "class", "category-main-text d-inline");
    			add_location(p14, file$5, 527, 52, 49223);
    			attr_dev(a44, "href", "#");
    			attr_dev(a44, "class", "category-main-text-link");
    			add_location(a44, file$5, 526, 50, 49126);
    			attr_dev(h511, "class", "mb-0");
    			add_location(h511, file$5, 524, 48, 48940);
    			attr_dev(div90, "class", "border-bottom py-2");
    			attr_dev(div90, "id", "");
    			add_location(div90, file$5, 523, 44, 48853);
    			attr_dev(div91, "id", "collapseTwo");
    			attr_dev(div91, "class", "collapse mr-3");
    			attr_dev(div91, "aria-labelledby", "headingTwo");
    			attr_dev(div91, "data-parent", "#accordion");
    			add_location(div91, file$5, 522, 42, 48710);
    			attr_dev(div92, "class", "mb-2 pl-2");
    			add_location(div92, file$5, 513, 40, 47932);
    			attr_dev(a45, "href", "#");
    			attr_dev(a45, "class", "p-0 d-inline category_button collapsed");
    			attr_dev(a45, "data-toggle", "collapse");
    			attr_dev(a45, "data-target", "#collapseThree");
    			attr_dev(a45, "aria-expanded", "false");
    			attr_dev(a45, "aria-controls", "collapseThree");
    			add_location(a45, file$5, 536, 46, 49798);
    			attr_dev(p15, "class", "category-main-text d-inline");
    			add_location(p15, file$5, 538, 48, 50105);
    			attr_dev(a46, "href", "#");
    			attr_dev(a46, "class", "category-main-text-link");
    			add_location(a46, file$5, 537, 46, 50012);
    			attr_dev(h512, "class", "mb-0");
    			add_location(h512, file$5, 535, 44, 49734);
    			attr_dev(div93, "class", "border-bottom pb-2");
    			attr_dev(div93, "id", "headingThree");
    			add_location(div93, file$5, 534, 42, 49639);
    			attr_dev(i33, "class", "fas fa-dot-circle p-0 d-inline category_button-non");
    			add_location(i33, file$5, 545, 50, 50656);
    			attr_dev(p16, "class", "category-main-text d-inline");
    			add_location(p16, file$5, 547, 52, 50871);
    			attr_dev(a47, "href", "#");
    			attr_dev(a47, "class", "category-main-text-link");
    			add_location(a47, file$5, 546, 50, 50774);
    			attr_dev(h513, "class", "mb-0");
    			add_location(h513, file$5, 544, 48, 50588);
    			attr_dev(div94, "class", "border-bottom py-2");
    			attr_dev(div94, "id", "");
    			add_location(div94, file$5, 543, 44, 50501);
    			attr_dev(div95, "id", "collapseThree");
    			attr_dev(div95, "class", "collapse mr-3");
    			attr_dev(div95, "aria-labelledby", "headingThree");
    			attr_dev(div95, "data-parent", "#accordion");
    			add_location(div95, file$5, 542, 42, 50354);
    			attr_dev(div96, "class", "mb-2 pl-2");
    			add_location(div96, file$5, 533, 40, 49573);
    			attr_dev(div97, "id", "accordion");

    			attr_dev(div97, "class", div97_class_value = /*x*/ ctx[0] <= 767
    			? "modal-dialog modal-content pr-2"
    			: "");

    			attr_dev(div97, "role", div97_role_value = /*x*/ ctx[0] <= 767 ? "document" : "");
    			add_location(div97, file$5, 384, 36, 35656);
    			attr_dev(div98, "class", div98_class_value = "modal-category-main " + (/*x*/ ctx[0] <= 767 ? "modal right fade" : "") + " mt-2 mr-1 col-12 p-0 d-lg-inline");
    			attr_dev(div98, "id", div98_id_value = /*x*/ ctx[0] <= 767 ? "mod2" : "");
    			attr_dev(div98, "tabindex", div98_tabindex_value = /*x*/ ctx[0] <= 767 ? "-1" : "");
    			attr_dev(div98, "role", div98_role_value = /*x*/ ctx[0] <= 767 ? "dialog" : "");
    			attr_dev(div98, "aria-hidden", "true");
    			add_location(div98, file$5, 383, 32, 35407);

    			attr_dev(div99, "class", div99_class_value = /*x*/ ctx[0] >= 767
    			? "row direction shadow-radius-section mt-4 py-2 bg-white"
    			: "row direction ");

    			add_location(div99, file$5, 376, 28, 34584);
    			attr_dev(aside2, "class", " col-12 col-md-3 mt-3 ");
    			add_location(aside2, file$5, 364, 24, 33874);
    			attr_dev(div100, "class", "row px-0 mx-0");
    			add_location(div100, file$5, 153, 20, 8060);
    			attr_dev(div101, "id", "post");
    			attr_dev(div101, "class", "row tab-pane");
    			toggle_class(div101, "active", /*current*/ ctx[3] === "post");
    			add_location(div101, file$5, 152, 16, 7969);
    			attr_dev(h514, "class", "text-bold mb-2");
    			add_location(h514, file$5, 563, 32, 51719);
    			attr_dev(p17, "class", "text-secondary text-justify word-space");
    			add_location(p17, file$5, 564, 32, 51797);
    			attr_dev(div102, "class", "col-6 text-bold pr-0");
    			add_location(div102, file$5, 571, 40, 52524);
    			attr_dev(a48, "class", "text-primary");
    			attr_dev(a48, "href", "#");
    			add_location(a48, file$5, 573, 44, 52695);
    			attr_dev(div103, "class", "col-6 text-bold pr-0 mb-4");
    			add_location(div103, file$5, 572, 40, 52611);
    			attr_dev(div104, "class", "col-6 text-bold pr-0");
    			add_location(div104, file$5, 577, 40, 52933);
    			attr_dev(div105, "class", "col-6 pr-0 mb-4 text-secondary");
    			add_location(div105, file$5, 578, 40, 53024);
    			attr_dev(div106, "class", "col-6 text-bold pr-0");
    			add_location(div106, file$5, 581, 40, 53230);
    			attr_dev(div107, "class", "col-6 pr-0 mb-4 text-secondary");
    			add_location(div107, file$5, 582, 40, 53324);
    			attr_dev(div108, "class", "col-6 text-bold pr-0");
    			add_location(div108, file$5, 585, 40, 53513);
    			attr_dev(div109, "class", "col-6 pr-0 mb-4 text-secondary");
    			add_location(div109, file$5, 586, 40, 53605);
    			attr_dev(div110, "class", "col-6 text-bold pr-0");
    			add_location(div110, file$5, 589, 40, 53786);
    			attr_dev(div111, "class", "col-6 pr-0 mb-4 text-secondary");
    			add_location(div111, file$5, 590, 40, 53874);
    			attr_dev(div112, "class", "col-6 text-bold pr-0");
    			add_location(div112, file$5, 593, 40, 54077);
    			attr_dev(div113, "class", "col-6 pr-0 mb-4 text-secondary");
    			add_location(div113, file$5, 594, 40, 54167);
    			attr_dev(div114, "class", "row ");
    			add_location(div114, file$5, 570, 36, 52465);
    			attr_dev(div115, "class", "col-12");
    			add_location(div115, file$5, 569, 32, 52408);
    			attr_dev(div116, "class", "col-12 ");
    			add_location(div116, file$5, 562, 28, 51665);
    			attr_dev(div117, "class", "row bg-white shadow-radius-section ml-1 py-4 px-1");
    			add_location(div117, file$5, 561, 24, 51573);
    			attr_dev(h515, "class", "text-bold ");
    			add_location(h515, file$5, 603, 32, 54658);
    			attr_dev(p18, "class", "text-secondary text-justify word-space");
    			add_location(p18, file$5, 604, 32, 54738);
    			attr_dev(div118, "class", "row");
    			add_location(div118, file$5, 607, 32, 54929);
    			attr_dev(div119, "class", "col-12 ");
    			add_location(div119, file$5, 602, 28, 54604);
    			attr_dev(div120, "class", "row bg-white shadow-radius-section ml-1 py-4 px-1 mt-3");
    			add_location(div120, file$5, 601, 24, 54507);
    			attr_dev(div121, "class", "col-12 direction ");
    			add_location(div121, file$5, 560, 20, 51517);
    			attr_dev(div122, "id", "about");
    			attr_dev(div122, "class", "row tab-pane mt-3 margin-about-right");
    			toggle_class(div122, "active", /*current*/ ctx[3] === "about");
    			add_location(div122, file$5, 559, 16, 51400);
    			attr_dev(div123, "class", "tab-content w-100 mr-0");
    			add_location(div123, file$5, 151, 12, 7916);
    			attr_dev(aside3, "class", "col-12 col-lg-8  ");
    			add_location(aside3, file$5, 105, 8, 4345);
    			attr_dev(div124, "class", "row justify-content-center mx-0");
    			add_location(div124, file$5, 90, 4, 3744);
    			attr_dev(main, "class", "container-fluid pin-parent px-0 px-md-3");
    			add_location(main, file$5, 88, 0, 3663);
    			add_location(br0, file$5, 620, 0, 55212);
    			add_location(br1, file$5, 620, 4, 55216);
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div124);
    			append_dev(div124, aside0);
    			append_dev(aside0, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, a0);
    			append_dev(a0, img0);
    			append_dev(div124, t1);
    			append_dev(div124, aside3);
    			append_dev(aside3, div16);
    			append_dev(div16, div15);
    			append_dev(div15, div14);
    			append_dev(div14, div4);
    			append_dev(div4, img1);
    			append_dev(div14, t2);
    			append_dev(div14, div5);
    			append_dev(div5, img2);
    			append_dev(div14, t3);
    			append_dev(div14, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, h30);
    			append_dev(h30, t4);
    			append_dev(h30, i0);
    			append_dev(div9, t5);
    			append_dev(div9, h60);
    			append_dev(h60, i1);
    			append_dev(h60, t6);
    			append_dev(div9, t7);
    			append_dev(div9, h61);
    			append_dev(div9, t9);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, button0);
    			append_dev(button0, i2);
    			append_dev(button0, t10);
    			append_dev(div7, t11);
    			append_dev(div7, div6);
    			append_dev(div6, button1);
    			append_dev(div6, t13);
    			append_dev(div6, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a1);
    			append_dev(a1, i3);
    			append_dev(a1, t14);
    			append_dev(ul0, t15);
    			append_dev(ul0, li1);
    			append_dev(li1, a2);
    			append_dev(a2, i4);
    			append_dev(a2, t16);
    			append_dev(div14, t17);
    			append_dev(div14, div13);
    			append_dev(div13, div12);
    			append_dev(div12, ul1);
    			append_dev(ul1, li2);
    			append_dev(li2, a3);
    			append_dev(ul1, t19);
    			append_dev(ul1, li3);
    			append_dev(li3, a4);
    			append_dev(aside3, t21);
    			append_dev(aside3, div123);
    			append_dev(div123, div101);
    			append_dev(div101, div100);
    			append_dev(div100, aside1);
    			append_dev(aside1, section);
    			append_dev(section, div56);
    			append_dev(div56, article0);
    			append_dev(article0, div24);
    			append_dev(div24, div23);
    			append_dev(div23, div21);
    			append_dev(div21, div20);
    			append_dev(div20, div17);
    			append_dev(div17, img3);
    			append_dev(div20, t22);
    			append_dev(div20, div19);
    			append_dev(div19, div18);
    			append_dev(div18, h62);
    			append_dev(h62, a5);
    			append_dev(a5, t23);
    			append_dev(a5, i5);
    			append_dev(div18, t24);
    			append_dev(div18, span0);
    			append_dev(span0, i6);
    			append_dev(span0, t25);
    			append_dev(div23, t26);
    			append_dev(div23, div22);
    			append_dev(div22, i7);
    			append_dev(div22, t27);
    			append_dev(div22, ul2);
    			append_dev(ul2, li4);
    			append_dev(li4, a6);
    			append_dev(a6, i8);
    			append_dev(a6, t28);
    			append_dev(ul2, t29);
    			append_dev(ul2, li5);
    			append_dev(li5, a7);
    			append_dev(a7, i9);
    			append_dev(a7, t30);
    			append_dev(ul2, t31);
    			append_dev(ul2, li6);
    			append_dev(li6, a8);
    			append_dev(a8, i10);
    			append_dev(a8, t32);
    			append_dev(article0, t33);
    			append_dev(article0, div25);
    			append_dev(div25, h31);
    			append_dev(h31, a9);
    			append_dev(article0, t35);
    			append_dev(article0, div26);
    			append_dev(div26, img4);
    			append_dev(article0, t36);
    			append_dev(article0, p0);
    			append_dev(p0, span1);
    			append_dev(p0, t38);
    			append_dev(p0, span2);
    			append_dev(p0, t40);
    			append_dev(p0, span3);
    			append_dev(span3, div27);
    			append_dev(div27, a10);
    			append_dev(a10, button2);
    			append_dev(article0, t42);
    			append_dev(article0, div29);
    			append_dev(div29, a11);
    			append_dev(a11, img5);
    			append_dev(a11, t43);
    			append_dev(a11, span4);
    			append_dev(a11, t45);
    			append_dev(div29, t46);
    			append_dev(div29, div28);
    			append_dev(div28, i11);
    			append_dev(div28, t47);
    			append_dev(div56, t48);
    			append_dev(div56, article1);
    			append_dev(article1, div37);
    			append_dev(div37, div36);
    			append_dev(div36, div34);
    			append_dev(div34, div33);
    			append_dev(div33, div30);
    			append_dev(div30, img6);
    			append_dev(div33, t49);
    			append_dev(div33, div32);
    			append_dev(div32, div31);
    			append_dev(div31, h63);
    			append_dev(h63, a12);
    			append_dev(a12, t50);
    			append_dev(a12, i12);
    			append_dev(div31, t51);
    			append_dev(div31, span5);
    			append_dev(span5, i13);
    			append_dev(span5, t52);
    			append_dev(div36, t53);
    			append_dev(div36, div35);
    			append_dev(div35, i14);
    			append_dev(div35, t54);
    			append_dev(div35, ul3);
    			append_dev(ul3, li7);
    			append_dev(li7, a13);
    			append_dev(a13, i15);
    			append_dev(a13, t55);
    			append_dev(ul3, t56);
    			append_dev(ul3, li8);
    			append_dev(li8, a14);
    			append_dev(a14, i16);
    			append_dev(a14, t57);
    			append_dev(ul3, t58);
    			append_dev(ul3, li9);
    			append_dev(li9, a15);
    			append_dev(a15, i17);
    			append_dev(a15, t59);
    			append_dev(article1, t60);
    			append_dev(article1, div38);
    			append_dev(div38, h32);
    			append_dev(h32, a16);
    			append_dev(article1, t62);
    			append_dev(article1, div39);
    			append_dev(div39, img7);
    			append_dev(article1, t63);
    			append_dev(article1, p1);
    			append_dev(p1, span6);
    			append_dev(p1, t65);
    			append_dev(p1, span7);
    			append_dev(p1, t67);
    			append_dev(p1, span8);
    			append_dev(span8, div40);
    			append_dev(div40, a17);
    			append_dev(a17, button3);
    			append_dev(article1, t69);
    			append_dev(article1, div42);
    			append_dev(div42, a18);
    			append_dev(a18, img8);
    			append_dev(a18, t70);
    			append_dev(a18, span9);
    			append_dev(a18, t72);
    			append_dev(div42, t73);
    			append_dev(div42, div41);
    			append_dev(div41, i18);
    			append_dev(div41, t74);
    			append_dev(div56, t75);
    			append_dev(div56, article2);
    			append_dev(article2, div50);
    			append_dev(div50, div49);
    			append_dev(div49, div47);
    			append_dev(div47, div46);
    			append_dev(div46, div43);
    			append_dev(div43, img9);
    			append_dev(div46, t76);
    			append_dev(div46, div45);
    			append_dev(div45, div44);
    			append_dev(div44, h64);
    			append_dev(h64, a19);
    			append_dev(a19, t77);
    			append_dev(a19, i19);
    			append_dev(div44, t78);
    			append_dev(div44, span10);
    			append_dev(span10, i20);
    			append_dev(span10, t79);
    			append_dev(div49, t80);
    			append_dev(div49, div48);
    			append_dev(div48, i21);
    			append_dev(div48, t81);
    			append_dev(div48, ul4);
    			append_dev(ul4, li10);
    			append_dev(li10, a20);
    			append_dev(a20, i22);
    			append_dev(a20, t82);
    			append_dev(ul4, t83);
    			append_dev(ul4, li11);
    			append_dev(li11, a21);
    			append_dev(a21, i23);
    			append_dev(a21, t84);
    			append_dev(ul4, t85);
    			append_dev(ul4, li12);
    			append_dev(li12, a22);
    			append_dev(a22, i24);
    			append_dev(a22, t86);
    			append_dev(article2, t87);
    			append_dev(article2, div51);
    			append_dev(div51, h33);
    			append_dev(h33, a23);
    			append_dev(article2, t89);
    			append_dev(article2, div52);
    			append_dev(div52, img10);
    			append_dev(article2, t90);
    			append_dev(article2, p2);
    			append_dev(p2, span11);
    			append_dev(p2, t92);
    			append_dev(p2, span12);
    			append_dev(p2, t94);
    			append_dev(p2, span13);
    			append_dev(span13, div53);
    			append_dev(div53, a24);
    			append_dev(a24, button4);
    			append_dev(article2, t96);
    			append_dev(article2, div55);
    			append_dev(div55, a25);
    			append_dev(a25, img11);
    			append_dev(a25, t97);
    			append_dev(a25, span14);
    			append_dev(a25, t99);
    			append_dev(div55, t100);
    			append_dev(div55, div54);
    			append_dev(div54, i25);
    			append_dev(div54, t101);
    			append_dev(div100, t102);
    			append_dev(div100, aside2);
    			append_dev(aside2, div58);
    			append_dev(div58, div57);
    			append_dev(div57, img12);
    			append_dev(div58, t103);
    			append_dev(div58, h34);
    			append_dev(div58, t105);
    			append_dev(div58, h65);
    			append_dev(aside2, t107);
    			append_dev(aside2, div99);
    			append_dev(div99, div59);
    			append_dev(div59, a26);
    			append_dev(a26, i26);
    			append_dev(a26, t108);
    			append_dev(div59, span15);
    			append_dev(div99, t110);
    			append_dev(div99, div98);
    			append_dev(div98, div97);
    			if (if_block1) if_block1.m(div97, null);
    			append_dev(div97, t111);
    			append_dev(div97, div88);
    			append_dev(div88, div60);
    			append_dev(div60, h50);
    			append_dev(h50, i27);
    			append_dev(h50, t112);
    			append_dev(h50, a27);
    			append_dev(a27, p3);
    			append_dev(div88, t114);
    			append_dev(div88, div61);
    			append_dev(div61, h51);
    			append_dev(h51, a28);
    			append_dev(h51, t115);
    			append_dev(h51, a29);
    			append_dev(a29, p4);
    			append_dev(div88, t117);
    			append_dev(div88, div87);
    			append_dev(div87, div86);
    			append_dev(div86, div85);
    			append_dev(div85, div84);
    			append_dev(div84, div83);
    			append_dev(div83, div62);
    			append_dev(div62, h52);
    			append_dev(h52, a30);
    			append_dev(h52, t118);
    			append_dev(h52, a31);
    			append_dev(a31, p5);
    			append_dev(div83, t120);
    			append_dev(div83, div65);
    			append_dev(div65, div64);
    			append_dev(div64, div63);
    			append_dev(div63, h53);
    			append_dev(h53, i28);
    			append_dev(h53, t121);
    			append_dev(h53, a32);
    			append_dev(a32, p6);
    			append_dev(div83, t123);
    			append_dev(div83, div69);
    			append_dev(div69, div66);
    			append_dev(div66, h54);
    			append_dev(h54, a33);
    			append_dev(h54, t124);
    			append_dev(h54, a34);
    			append_dev(a34, p7);
    			append_dev(div69, t126);
    			append_dev(div69, div68);
    			append_dev(div68, div67);
    			append_dev(div67, h55);
    			append_dev(h55, i29);
    			append_dev(h55, t127);
    			append_dev(h55, a35);
    			append_dev(a35, p8);
    			append_dev(div83, t129);
    			append_dev(div83, div82);
    			append_dev(div82, div70);
    			append_dev(div70, h56);
    			append_dev(h56, a36);
    			append_dev(h56, t130);
    			append_dev(h56, a37);
    			append_dev(a37, p9);
    			append_dev(div82, t132);
    			append_dev(div82, div81);
    			append_dev(div81, div80);
    			append_dev(div80, div79);
    			append_dev(div79, div78);
    			append_dev(div78, div74);
    			append_dev(div74, div71);
    			append_dev(div71, h57);
    			append_dev(h57, a38);
    			append_dev(h57, t133);
    			append_dev(h57, a39);
    			append_dev(a39, p10);
    			append_dev(div74, t135);
    			append_dev(div74, div73);
    			append_dev(div73, div72);
    			append_dev(div72, h58);
    			append_dev(h58, i30);
    			append_dev(h58, t136);
    			append_dev(h58, a40);
    			append_dev(a40, p11);
    			append_dev(div78, t138);
    			append_dev(div78, div75);
    			append_dev(div75, h59);
    			append_dev(h59, i31);
    			append_dev(h59, t139);
    			append_dev(h59, a41);
    			append_dev(a41, p12);
    			append_dev(div78, t141);
    			append_dev(div78, div77);
    			append_dev(div77, div76);
    			append_dev(div97, t143);
    			append_dev(div97, div92);
    			append_dev(div92, div89);
    			append_dev(div89, h510);
    			append_dev(h510, a42);
    			append_dev(h510, t144);
    			append_dev(h510, a43);
    			append_dev(a43, p13);
    			append_dev(div92, t146);
    			append_dev(div92, div91);
    			append_dev(div91, div90);
    			append_dev(div90, h511);
    			append_dev(h511, i32);
    			append_dev(h511, t147);
    			append_dev(h511, a44);
    			append_dev(a44, p14);
    			append_dev(div97, t149);
    			append_dev(div97, div96);
    			append_dev(div96, div93);
    			append_dev(div93, h512);
    			append_dev(h512, a45);
    			append_dev(h512, t150);
    			append_dev(h512, a46);
    			append_dev(a46, p15);
    			append_dev(div96, t152);
    			append_dev(div96, div95);
    			append_dev(div95, div94);
    			append_dev(div94, h513);
    			append_dev(h513, i33);
    			append_dev(h513, t153);
    			append_dev(h513, a47);
    			append_dev(a47, p16);
    			append_dev(div123, t155);
    			append_dev(div123, div122);
    			append_dev(div122, div121);
    			append_dev(div121, div117);
    			append_dev(div117, div116);
    			append_dev(div116, h514);
    			append_dev(div116, t157);
    			append_dev(div116, p17);
    			append_dev(div116, t159);
    			append_dev(div116, div115);
    			append_dev(div115, div114);
    			append_dev(div114, div102);
    			append_dev(div114, t161);
    			append_dev(div114, div103);
    			append_dev(div103, a48);
    			append_dev(div114, t163);
    			append_dev(div114, div104);
    			append_dev(div114, t165);
    			append_dev(div114, div105);
    			append_dev(div114, t167);
    			append_dev(div114, div106);
    			append_dev(div114, t169);
    			append_dev(div114, div107);
    			append_dev(div114, t171);
    			append_dev(div114, div108);
    			append_dev(div114, t173);
    			append_dev(div114, div109);
    			append_dev(div114, t175);
    			append_dev(div114, div110);
    			append_dev(div114, t177);
    			append_dev(div114, div111);
    			append_dev(div114, t179);
    			append_dev(div114, div112);
    			append_dev(div114, t181);
    			append_dev(div114, div113);
    			append_dev(div121, t183);
    			append_dev(div121, div120);
    			append_dev(div120, div119);
    			append_dev(div119, h515);
    			append_dev(div119, t185);
    			append_dev(div119, p18);
    			append_dev(div119, t187);
    			append_dev(div119, div118);
    			insert_dev(target, t188, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, br1, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(a3, "click", /*click_handler_2*/ ctx[8], false, false, false),
    					listen_dev(a4, "click", /*click_handler_3*/ ctx[9], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*y*/ ctx[1] > 600) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*y*/ 2) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*current*/ 8) {
    				toggle_class(a3, "active", /*current*/ ctx[3] === "post");
    			}

    			if (dirty & /*current*/ 8) {
    				toggle_class(a4, "active", /*current*/ ctx[3] === "about");
    			}

    			if (dirty & /*x*/ 1) {
    				toggle_class(div58, "d-none", /*x*/ ctx[0] <= 767);
    			}

    			if (!current || dirty & /*x*/ 1 && i26_class_value !== (i26_class_value = "" + ((/*x*/ ctx[0] >= 767
    			? "fas fa-list-ul category-icon-modal"
    			: "fas fa-caret-left") + " "))) {
    				attr_dev(i26, "class", i26_class_value);
    			}

    			if (dirty & /*x, x, y*/ 3) {
    				toggle_class(i26, "category-fixed-icon-modal", /*x*/ ctx[0] <= 767 && /*y*/ ctx[1] >= 400);
    			}

    			if (!current || dirty & /*x*/ 1 && a26_type_value !== (a26_type_value = /*x*/ ctx[0] <= 767 ? "button" : "")) {
    				attr_dev(a26, "type", a26_type_value);
    			}

    			if (!current || dirty & /*x*/ 1 && a26_data_toggle_value !== (a26_data_toggle_value = /*x*/ ctx[0] <= 767 ? "modal" : "")) {
    				attr_dev(a26, "data-toggle", a26_data_toggle_value);
    			}

    			if (!current || dirty & /*x*/ 1 && a26_data_target_value !== (a26_data_target_value = /*x*/ ctx[0] <= 767 ? "#mod2" : "")) {
    				attr_dev(a26, "data-target", a26_data_target_value);
    			}

    			if (!current || dirty & /*x*/ 1 && div59_class_value !== (div59_class_value = /*x*/ ctx[0] >= 767
    			? "col-12 font-weight-bold pb-2 border-bottom pr-0"
    			: "col-12 font-weight-bold")) {
    				attr_dev(div59, "class", div59_class_value);
    			}

    			if (/*x*/ ctx[0] <= 767) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					if_block1.m(div97, t111);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (!current || dirty & /*x*/ 1 && div97_class_value !== (div97_class_value = /*x*/ ctx[0] <= 767
    			? "modal-dialog modal-content pr-2"
    			: "")) {
    				attr_dev(div97, "class", div97_class_value);
    			}

    			if (!current || dirty & /*x*/ 1 && div97_role_value !== (div97_role_value = /*x*/ ctx[0] <= 767 ? "document" : "")) {
    				attr_dev(div97, "role", div97_role_value);
    			}

    			if (!current || dirty & /*x*/ 1 && div98_class_value !== (div98_class_value = "modal-category-main " + (/*x*/ ctx[0] <= 767 ? "modal right fade" : "") + " mt-2 mr-1 col-12 p-0 d-lg-inline")) {
    				attr_dev(div98, "class", div98_class_value);
    			}

    			if (!current || dirty & /*x*/ 1 && div98_id_value !== (div98_id_value = /*x*/ ctx[0] <= 767 ? "mod2" : "")) {
    				attr_dev(div98, "id", div98_id_value);
    			}

    			if (!current || dirty & /*x*/ 1 && div98_tabindex_value !== (div98_tabindex_value = /*x*/ ctx[0] <= 767 ? "-1" : "")) {
    				attr_dev(div98, "tabindex", div98_tabindex_value);
    			}

    			if (!current || dirty & /*x*/ 1 && div98_role_value !== (div98_role_value = /*x*/ ctx[0] <= 767 ? "dialog" : "")) {
    				attr_dev(div98, "role", div98_role_value);
    			}

    			if (!current || dirty & /*x*/ 1 && div99_class_value !== (div99_class_value = /*x*/ ctx[0] >= 767
    			? "row direction shadow-radius-section mt-4 py-2 bg-white"
    			: "row direction ")) {
    				attr_dev(div99, "class", div99_class_value);
    			}

    			if (dirty & /*current*/ 8) {
    				toggle_class(div101, "active", /*current*/ ctx[3] === "post");
    			}

    			if (dirty & /*current*/ 8) {
    				toggle_class(div122, "active", /*current*/ ctx[3] === "about");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);

    			add_render_callback(() => {
    				if (!main_transition) main_transition = create_bidirectional_transition(main, scale, {}, true);
    				main_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			if (!main_transition) main_transition = create_bidirectional_transition(main, scale, {}, false);
    			main_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			if (if_block1) if_block1.d();
    			if (detaching && main_transition) main_transition.end();
    			if (detaching) detach_dev(t188);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(br1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(41:0) <Router url=\\\"{url}\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let scrolling = false;

    	let clear_scrolling = () => {
    		scrolling = false;
    	};

    	let scrolling_timeout;
    	let t;
    	let router;
    	let current;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowscroll*/ ctx[4]);
    	add_render_callback(/*onwindowresize*/ ctx[5]);

    	router = new Router({
    			props: {
    				url: /*url*/ ctx[2],
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			t = space();
    			create_component(router.$$.fragment);
    			document.title = "\n        مجله\n    ";
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    			mount_component(router, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window_1$1, "scroll", () => {
    						scrolling = true;
    						clearTimeout(scrolling_timeout);
    						scrolling_timeout = setTimeout(clear_scrolling, 100);
    						/*onwindowscroll*/ ctx[4]();
    					}),
    					listen_dev(window_1$1, "resize", /*onwindowresize*/ ctx[5])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*y*/ 2 && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window_1$1.pageXOffset, /*y*/ ctx[1]);
    				scrolling_timeout = setTimeout(clear_scrolling, 100);
    			}

    			const router_changes = {};
    			if (dirty & /*url*/ 4) router_changes.url = /*url*/ ctx[2];

    			if (dirty & /*$$scope, current, x, y*/ 262155) {
    				router_changes.$$scope = { dirty, ctx };
    			}

    			router.$set(router_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    			destroy_component(router, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Magezine", slots, []);
    	let { url = "" } = $$props;
    	let { y } = $$props;
    	let { x } = $$props;
    	const urlParams = new URLSearchParams(window.location.search);
    	const id = urlParams.has("id");
    	console.log(id);
    	let isOpen = false;
    	let current = "post";

    	function toggleNav() {
    		isOpen = !isOpen;
    	}

    	//let y=0;
    	var currentLocation = window.location.href;

    	var splitUrl = currentLocation.split("/");
    	var lastSugment = splitUrl[splitUrl.length - 1];

    	// $ : console.log(lastSugment);
    	let map;

    	const writable_props = ["url", "y", "x"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Magezine> was created with unknown prop '${key}'`);
    	});

    	function onwindowscroll() {
    		$$invalidate(1, y = window_1$1.pageYOffset);
    	}

    	function onwindowresize() {
    		$$invalidate(0, x = window_1$1.innerWidth);
    	}

    	const click_handler = () => $$invalidate(3, current = "post");
    	const click_handler_1 = () => $$invalidate(3, current = "about");
    	const click_handler_2 = () => $$invalidate(3, current = "post");
    	const click_handler_3 = () => $$invalidate(3, current = "about");

    	$$self.$$set = $$props => {
    		if ("url" in $$props) $$invalidate(2, url = $$props.url);
    		if ("y" in $$props) $$invalidate(1, y = $$props.y);
    		if ("x" in $$props) $$invalidate(0, x = $$props.x);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		fade,
    		slide,
    		scale,
    		fly,
    		Loader,
    		Router,
    		Link,
    		Route,
    		circIn,
    		showDetail: Show_detail,
    		profile: Profile,
    		url,
    		y,
    		x,
    		urlParams,
    		id,
    		isOpen,
    		current,
    		toggleNav,
    		currentLocation,
    		splitUrl,
    		lastSugment,
    		map
    	});

    	$$self.$inject_state = $$props => {
    		if ("url" in $$props) $$invalidate(2, url = $$props.url);
    		if ("y" in $$props) $$invalidate(1, y = $$props.y);
    		if ("x" in $$props) $$invalidate(0, x = $$props.x);
    		if ("isOpen" in $$props) isOpen = $$props.isOpen;
    		if ("current" in $$props) $$invalidate(3, current = $$props.current);
    		if ("currentLocation" in $$props) currentLocation = $$props.currentLocation;
    		if ("splitUrl" in $$props) splitUrl = $$props.splitUrl;
    		if ("lastSugment" in $$props) lastSugment = $$props.lastSugment;
    		if ("map" in $$props) map = $$props.map;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*x*/ 1) {
    			console.log(x);
    		}
    	};

    	return [
    		x,
    		y,
    		url,
    		current,
    		onwindowscroll,
    		onwindowresize,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3
    	];
    }

    class Magezine extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { url: 2, y: 1, x: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Magezine",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*y*/ ctx[1] === undefined && !("y" in props)) {
    			console_1$1.warn("<Magezine> was created without expected prop 'y'");
    		}

    		if (/*x*/ ctx[0] === undefined && !("x" in props)) {
    			console_1$1.warn("<Magezine> was created without expected prop 'x'");
    		}
    	}

    	get url() {
    		throw new Error("<Magezine>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Magezine>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get y() {
    		throw new Error("<Magezine>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<Magezine>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get x() {
    		throw new Error("<Magezine>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set x(value) {
    		throw new Error("<Magezine>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/pages/home.svelte generated by Svelte v3.38.3 */

    const { window: window_1 } = globals;
    const file$4 = "src/pages/home.svelte";

    function create_fragment$4(ctx) {
    	let scrolling = false;

    	let clear_scrolling = () => {
    		scrolling = false;
    	};

    	let scrolling_timeout;
    	let t0;
    	let main;
    	let div46;
    	let aside0;
    	let t2;
    	let aside1;
    	let section0;
    	let div1;
    	let article0;
    	let img0;
    	let img0_src_value;
    	let t3;
    	let a0;
    	let h50;
    	let t5;
    	let a1;
    	let img1;
    	let img1_src_value;
    	let t6;
    	let div0;
    	let span0;
    	let t7;
    	let i0;
    	let t8;
    	let i1;
    	let t9;
    	let t10;
    	let div3;
    	let article1;
    	let img2;
    	let img2_src_value;
    	let t11;
    	let a2;
    	let h51;
    	let t13;
    	let a3;
    	let img3;
    	let img3_src_value;
    	let t14;
    	let div2;
    	let span1;
    	let t15;
    	let i2;
    	let t16;
    	let i3;
    	let t17;
    	let t18;
    	let div5;
    	let article2;
    	let img4;
    	let img4_src_value;
    	let t19;
    	let a4;
    	let h52;
    	let t21;
    	let a5;
    	let img5;
    	let img5_src_value;
    	let t22;
    	let div4;
    	let span2;
    	let t23;
    	let i4;
    	let t24;
    	let i5;
    	let t25;
    	let t26;
    	let section1;
    	let div45;
    	let article3;
    	let div13;
    	let div12;
    	let div10;
    	let div9;
    	let div6;
    	let img6;
    	let img6_src_value;
    	let t27;
    	let div8;
    	let div7;
    	let h60;
    	let a6;
    	let t28;
    	let i6;
    	let t29;
    	let span3;
    	let i7;
    	let t30;
    	let t31;
    	let div11;
    	let i8;
    	let t32;
    	let ul0;
    	let li0;
    	let a7;
    	let i9;
    	let t33;
    	let t34;
    	let li1;
    	let a8;
    	let i10;
    	let t35;
    	let t36;
    	let li2;
    	let a9;
    	let i11;
    	let t37;
    	let t38;
    	let div14;
    	let h30;
    	let a10;
    	let t40;
    	let div15;
    	let img7;
    	let img7_src_value;
    	let t41;
    	let p0;
    	let span4;
    	let t43;
    	let span5;
    	let t45;
    	let span6;
    	let div16;
    	let a11;
    	let button0;
    	let t47;
    	let div18;
    	let a12;
    	let img8;
    	let img8_src_value;
    	let t48;
    	let span7;
    	let t50;
    	let t51;
    	let div17;
    	let i12;
    	let t52;
    	let t53;
    	let article4;
    	let div26;
    	let div25;
    	let div23;
    	let div22;
    	let div19;
    	let img9;
    	let img9_src_value;
    	let t54;
    	let div21;
    	let div20;
    	let h61;
    	let a13;
    	let t55;
    	let i13;
    	let t56;
    	let span8;
    	let i14;
    	let t57;
    	let t58;
    	let div24;
    	let i15;
    	let t59;
    	let ul1;
    	let li3;
    	let a14;
    	let i16;
    	let t60;
    	let t61;
    	let li4;
    	let a15;
    	let i17;
    	let t62;
    	let t63;
    	let li5;
    	let a16;
    	let i18;
    	let t64;
    	let t65;
    	let div27;
    	let h31;
    	let a17;
    	let t67;
    	let div28;
    	let img10;
    	let img10_src_value;
    	let t68;
    	let p1;
    	let span9;
    	let t70;
    	let span10;
    	let t72;
    	let span11;
    	let div29;
    	let a18;
    	let button1;
    	let t74;
    	let div31;
    	let a19;
    	let img11;
    	let img11_src_value;
    	let t75;
    	let span12;
    	let t77;
    	let t78;
    	let div30;
    	let i19;
    	let t79;
    	let t80;
    	let article5;
    	let div39;
    	let div38;
    	let div36;
    	let div35;
    	let div32;
    	let img12;
    	let img12_src_value;
    	let t81;
    	let div34;
    	let div33;
    	let h62;
    	let a20;
    	let t82;
    	let i20;
    	let t83;
    	let span13;
    	let i21;
    	let t84;
    	let t85;
    	let div37;
    	let i22;
    	let t86;
    	let ul2;
    	let li6;
    	let a21;
    	let i23;
    	let t87;
    	let t88;
    	let li7;
    	let a22;
    	let i24;
    	let t89;
    	let t90;
    	let li8;
    	let a23;
    	let i25;
    	let t91;
    	let t92;
    	let div40;
    	let h32;
    	let a24;
    	let t94;
    	let div41;
    	let img13;
    	let img13_src_value;
    	let t95;
    	let p2;
    	let span14;
    	let t97;
    	let span15;
    	let t99;
    	let span16;
    	let div42;
    	let a25;
    	let button2;
    	let t101;
    	let div44;
    	let a26;
    	let img14;
    	let img14_src_value;
    	let t102;
    	let span17;
    	let t104;
    	let t105;
    	let div43;
    	let i26;
    	let t106;
    	let t107;
    	let aside2;
    	let main_transition;
    	let t109;
    	let br0;
    	let hr;
    	let br1;
    	let br2;
    	let br3;
    	let current;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowscroll*/ ctx[6]);
    	add_render_callback(/*onwindowresize*/ ctx[7]);

    	const block = {
    		c: function create() {
    			t0 = space();
    			main = element("main");
    			div46 = element("div");
    			aside0 = element("aside");
    			aside0.textContent = "hello";
    			t2 = space();
    			aside1 = element("aside");
    			section0 = element("section");
    			div1 = element("div");
    			article0 = element("article");
    			img0 = element("img");
    			t3 = space();
    			a0 = element("a");
    			h50 = element("h5");
    			h50.textContent = "جدیدترین اخبار از تحریم فیس بوک توسط آمریکا";
    			t5 = space();
    			a1 = element("a");
    			img1 = element("img");
    			t6 = space();
    			div0 = element("div");
    			span0 = element("span");
    			t7 = text("برنامه تلویزیونی جهان آرا ");
    			i0 = element("i");
    			t8 = text("    ");
    			i1 = element("i");
    			t9 = text(" ۲ ماه قبل");
    			t10 = space();
    			div3 = element("div");
    			article1 = element("article");
    			img2 = element("img");
    			t11 = space();
    			a2 = element("a");
    			h51 = element("h5");
    			h51.textContent = "جدیدترین اخبار از تحریم فیس بوک توسط آمریکا";
    			t13 = space();
    			a3 = element("a");
    			img3 = element("img");
    			t14 = space();
    			div2 = element("div");
    			span1 = element("span");
    			t15 = text("فیس بوک ");
    			i2 = element("i");
    			t16 = text("    ");
    			i3 = element("i");
    			t17 = text(" ۲ ماه قبل");
    			t18 = space();
    			div5 = element("div");
    			article2 = element("article");
    			img4 = element("img");
    			t19 = space();
    			a4 = element("a");
    			h52 = element("h5");
    			h52.textContent = "به اینولینکس خوش آمدید";
    			t21 = space();
    			a5 = element("a");
    			img5 = element("img");
    			t22 = space();
    			div4 = element("div");
    			span2 = element("span");
    			t23 = text("خبرگذاری تسنیم ");
    			i4 = element("i");
    			t24 = text("    ");
    			i5 = element("i");
    			t25 = text(" ۲ ماه قبل");
    			t26 = space();
    			section1 = element("section");
    			div45 = element("div");
    			article3 = element("article");
    			div13 = element("div");
    			div12 = element("div");
    			div10 = element("div");
    			div9 = element("div");
    			div6 = element("div");
    			img6 = element("img");
    			t27 = space();
    			div8 = element("div");
    			div7 = element("div");
    			h60 = element("h6");
    			a6 = element("a");
    			t28 = text("مرکز رشد و نواوری آفرینه ");
    			i6 = element("i");
    			t29 = space();
    			span3 = element("span");
    			i7 = element("i");
    			t30 = text(" ۳ دقیقه قبل");
    			t31 = space();
    			div11 = element("div");
    			i8 = element("i");
    			t32 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			a7 = element("a");
    			i9 = element("i");
    			t33 = text(" ذخیره کردن پست");
    			t34 = space();
    			li1 = element("li");
    			a8 = element("a");
    			i10 = element("i");
    			t35 = text(" کپی کردن لینک");
    			t36 = space();
    			li2 = element("li");
    			a9 = element("a");
    			i11 = element("i");
    			t37 = text(" گزارش دادن");
    			t38 = space();
    			div14 = element("div");
    			h30 = element("h3");
    			a10 = element("a");
    			a10.textContent = "به اینولینکس خوش آمدید";
    			t40 = space();
    			div15 = element("div");
    			img7 = element("img");
    			t41 = space();
    			p0 = element("p");
    			span4 = element("span");
    			span4.textContent = "طراحان سایت هنگام طراحی قالب سایت معمولا با این موضوع رو برو هستند که محتوای اصلی صفحات آماده نیست. در نتیجه طرح کلی دید درستی به کار فرما نمیدهد. اگر طراح بخواهد دنبال متن های مرتبط بگردد تمرکزش از روی کار اصلی برداشته میشود و اینکار زمان بر خواهد بود. همچنین طراح به دنبال این است که پس از ارایه کار نظر دیگران را در مورد طراحی جویا شود و نمی‌خواهد افراد روی متن های موجود تمرکز کنند.\n                                    از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                    از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                    از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                    از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                    از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در  ]dc o,fdi نظر گرفته شده است.\n                                    از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                    از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                    از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                    از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\nنکته بعدی در مورد متن ساختگی لورم ایپسوم این است که بعضی از طراحان وبسایت و گرافیست کاران بعد از آنکه قالب و محتوای مورد نظرشون را ایجاد کردند از یاد می‌برند که متن لورم را از قسمتهای مختلف .";
    			t43 = space();
    			span5 = element("span");
    			span5.textContent = "بیشتر بخوانید";
    			t45 = space();
    			span6 = element("span");
    			div16 = element("div");
    			a11 = element("a");
    			button0 = element("button");
    			button0.textContent = "ادامه مطلب";
    			t47 = space();
    			div18 = element("div");
    			a12 = element("a");
    			img8 = element("img");
    			t48 = space();
    			span7 = element("span");
    			span7.textContent = "مسعودآقایی ساداتی";
    			t50 = text("  ");
    			t51 = space();
    			div17 = element("div");
    			i12 = element("i");
    			t52 = text(" ۵۶");
    			t53 = space();
    			article4 = element("article");
    			div26 = element("div");
    			div25 = element("div");
    			div23 = element("div");
    			div22 = element("div");
    			div19 = element("div");
    			img9 = element("img");
    			t54 = space();
    			div21 = element("div");
    			div20 = element("div");
    			h61 = element("h6");
    			a13 = element("a");
    			t55 = text("مرکز رشد و نواوری آفرینه ");
    			i13 = element("i");
    			t56 = space();
    			span8 = element("span");
    			i14 = element("i");
    			t57 = text(" ۳ دقیقه قبل");
    			t58 = space();
    			div24 = element("div");
    			i15 = element("i");
    			t59 = space();
    			ul1 = element("ul");
    			li3 = element("li");
    			a14 = element("a");
    			i16 = element("i");
    			t60 = text(" ذخیره کردن پست");
    			t61 = space();
    			li4 = element("li");
    			a15 = element("a");
    			i17 = element("i");
    			t62 = text(" کپی کردن لینک");
    			t63 = space();
    			li5 = element("li");
    			a16 = element("a");
    			i18 = element("i");
    			t64 = text(" گزارش دادن");
    			t65 = space();
    			div27 = element("div");
    			h31 = element("h3");
    			a17 = element("a");
    			a17.textContent = "به اینولینکس خوش آمدید";
    			t67 = space();
    			div28 = element("div");
    			img10 = element("img");
    			t68 = space();
    			p1 = element("p");
    			span9 = element("span");
    			span9.textContent = "طراحان سایت هنگام طراحی قالب سایت معمولا با این موضوع رو برو هستند که محتوای اصلی صفحات آماده نیست. در نتیجه طرح کلی دید درستی به کار فرما نمیدهد. اگر طراح بخواهد دنبال متن های مرتبط بگردد تمرکزش از روی کار اصلی برداشته میشود و اینکار زمان بر خواهد بود. همچنین طراح به دنبال این است که پس از ارایه کار نظر دیگران را در مورد طراحی جویا شود و نمی‌خواهد افراد روی متن های موجود تمرکز کنند.\n                                    از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                    از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                    از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                    از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                    از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                    از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                    از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                    از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                    از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\nنکته بعدی در مورد متن ساختگی لورم ایپسوم این است که بعضی از طراحان وبسایت و گرافیست کاران بعد از آنکه قالب و محتوای مورد نظرشون را ایجاد کردند از یاد می‌برند که متن لورم را از قسمتهای مختلف .";
    			t70 = space();
    			span10 = element("span");
    			span10.textContent = "بیشتر بخوانید";
    			t72 = space();
    			span11 = element("span");
    			div29 = element("div");
    			a18 = element("a");
    			button1 = element("button");
    			button1.textContent = "ادامه مطلب";
    			t74 = space();
    			div31 = element("div");
    			a19 = element("a");
    			img11 = element("img");
    			t75 = space();
    			span12 = element("span");
    			span12.textContent = "مسعودآقایی ساداتی";
    			t77 = text("  ");
    			t78 = space();
    			div30 = element("div");
    			i19 = element("i");
    			t79 = text(" ۵۶");
    			t80 = space();
    			article5 = element("article");
    			div39 = element("div");
    			div38 = element("div");
    			div36 = element("div");
    			div35 = element("div");
    			div32 = element("div");
    			img12 = element("img");
    			t81 = space();
    			div34 = element("div");
    			div33 = element("div");
    			h62 = element("h6");
    			a20 = element("a");
    			t82 = text("مرکز رشد و نواوری آفرینه ");
    			i20 = element("i");
    			t83 = space();
    			span13 = element("span");
    			i21 = element("i");
    			t84 = text(" ۳ دقیقه قبل");
    			t85 = space();
    			div37 = element("div");
    			i22 = element("i");
    			t86 = space();
    			ul2 = element("ul");
    			li6 = element("li");
    			a21 = element("a");
    			i23 = element("i");
    			t87 = text(" ذخیره کردن پست");
    			t88 = space();
    			li7 = element("li");
    			a22 = element("a");
    			i24 = element("i");
    			t89 = text(" کپی کردن لینک");
    			t90 = space();
    			li8 = element("li");
    			a23 = element("a");
    			i25 = element("i");
    			t91 = text(" گزارش دادن");
    			t92 = space();
    			div40 = element("div");
    			h32 = element("h3");
    			a24 = element("a");
    			a24.textContent = "به اینولینکس خوش آمدید";
    			t94 = space();
    			div41 = element("div");
    			img13 = element("img");
    			t95 = space();
    			p2 = element("p");
    			span14 = element("span");
    			span14.textContent = "طراحان سایت هنگام طراحی قالب سایت معمولا با این موضوع رو برو هستند که محتوای اصلی صفحات آماده نیست. در نتیجه طرح کلی دید درستی به کار فرما نمیدهد. اگر طراح بخواهد دنبال متن های مرتبط بگردد تمرکزش از روی کار اصلی برداشته میشود و اینکار زمان بر خواهد بود. همچنین طراح به دنبال این است که پس از ارایه کار نظر دیگران را در مورد طراحی جویا شود و نمی‌خواهد افراد روی متن های موجود تمرکز کنند.\n                                    از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                    از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                    از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\nنکته بعدی در مورد متن ساختگی لورم ایپسوم این است که بعضی از طراحان وبسایت و گرافیست کاران بعد از آنکه قالب و محتوای مورد نظرشون را ایجاد کردند از یاد می‌برند که متن لورم را از قسمتهای مختلف .";
    			t97 = space();
    			span15 = element("span");
    			span15.textContent = "بیشتر بخوانید";
    			t99 = space();
    			span16 = element("span");
    			div42 = element("div");
    			a25 = element("a");
    			button2 = element("button");
    			button2.textContent = "ادامه مطلب";
    			t101 = space();
    			div44 = element("div");
    			a26 = element("a");
    			img14 = element("img");
    			t102 = space();
    			span17 = element("span");
    			span17.textContent = "مسعودآقایی ساداتی";
    			t104 = text("  ");
    			t105 = space();
    			div43 = element("div");
    			i26 = element("i");
    			t106 = text(" ۵۶");
    			t107 = space();
    			aside2 = element("aside");
    			aside2.textContent = "hello1";
    			t109 = space();
    			br0 = element("br");
    			hr = element("hr");
    			br1 = element("br");
    			br2 = element("br");
    			br3 = element("br");
    			document.title = "\n        اینولینکس\n    ";
    			attr_dev(aside0, "class", "col-12 col-md-3  mx-1 mt-5 mt-md-0 bg-light shadow-radius-section");
    			add_location(aside0, file$4, 41, 8, 1157);
    			attr_dev(img0, "class", "image-pin-top");
    			if (img0.src !== (img0_src_value = "image/30.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$4, 46, 24, 1604);
    			add_location(h50, file$4, 48, 28, 1753);
    			attr_dev(a0, "class", "w-100 content-pin-top");
    			attr_dev(a0, "href", "#");
    			add_location(a0, file$4, 47, 24, 1682);
    			if (img1.src !== (img1_src_value = "/image/26.jpeg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "mag-img-top");
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$4, 51, 28, 1900);
    			attr_dev(a1, "href", "#");
    			add_location(a1, file$4, 50, 24, 1859);
    			set_style(i0, "color", "mediumspringgreen");
    			attr_dev(i0, "class", "fas fa-check-circle");
    			add_location(i0, file$4, 54, 60, 2101);
    			add_location(span0, file$4, 54, 28, 2069);
    			attr_dev(i1, "class", "fas fa-clock");
    			add_location(i1, file$4, 54, 144, 2185);
    			attr_dev(div0, "class", "author-time-pin-top");
    			add_location(div0, file$4, 53, 24, 2007);
    			attr_dev(article0, "class", "col-12 mb-md-4 first-article-main ");
    			toggle_class(article0, "pin-article-height", /*h*/ ctx[2] <= 465);
    			add_location(article0, file$4, 45, 20, 1493);
    			attr_dev(div1, "class", "col-12 mb-4 my-md-0");
    			add_location(div1, file$4, 44, 16, 1439);
    			attr_dev(img2, "class", "image-pin w-100");
    			if (img2.src !== (img2_src_value = "image/28.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$4, 60, 24, 2488);
    			add_location(h51, file$4, 62, 28, 2635);
    			attr_dev(a2, "class", "w-100 content-pin");
    			attr_dev(a2, "href", "#");
    			add_location(a2, file$4, 61, 24, 2568);
    			if (img3.src !== (img3_src_value = "/image/27.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "class", "mag-img");
    			attr_dev(img3, "alt", "");
    			add_location(img3, file$4, 65, 28, 2782);
    			attr_dev(a3, "href", "#");
    			add_location(a3, file$4, 64, 24, 2741);
    			set_style(i2, "color", "mediumspringgreen");
    			attr_dev(i2, "class", "fas fa-check-circle");
    			add_location(i2, file$4, 68, 42, 2956);
    			add_location(span1, file$4, 68, 28, 2942);
    			attr_dev(i3, "class", "fas fa-clock");
    			add_location(i3, file$4, 68, 126, 3040);
    			attr_dev(div2, "class", "author-time-pin");
    			add_location(div2, file$4, 67, 24, 2884);
    			attr_dev(article1, "class", "col-12");
    			toggle_class(article1, "pin-article-height", /*h*/ ctx[2] <= 465);
    			add_location(article1, file$4, 59, 20, 2405);
    			attr_dev(div3, "class", "col-12 col-xl-6 mb-4 my-md-0 pin-article-main");
    			add_location(div3, file$4, 58, 16, 2325);
    			attr_dev(img4, "class", "image-pin w-100");
    			if (img4.src !== (img4_src_value = "image/20.jpg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "");
    			add_location(img4, file$4, 74, 24, 3360);
    			add_location(h52, file$4, 76, 28, 3507);
    			attr_dev(a4, "class", "w-100 content-pin");
    			attr_dev(a4, "href", "#");
    			add_location(a4, file$4, 75, 24, 3440);
    			if (img5.src !== (img5_src_value = "/image/25.jpg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "class", "mag-img");
    			attr_dev(img5, "alt", "");
    			add_location(img5, file$4, 79, 28, 3633);
    			attr_dev(a5, "href", "#");
    			add_location(a5, file$4, 78, 24, 3592);
    			set_style(i4, "color", "mediumspringgreen");
    			attr_dev(i4, "class", "fas fa-check-circle");
    			add_location(i4, file$4, 82, 49, 3814);
    			add_location(span2, file$4, 82, 28, 3793);
    			attr_dev(i5, "class", "fas fa-clock");
    			add_location(i5, file$4, 82, 133, 3898);
    			attr_dev(div4, "class", "author-time-pin");
    			add_location(div4, file$4, 81, 24, 3735);
    			attr_dev(article2, "class", "col-12");
    			toggle_class(article2, "pin-article-height", /*h*/ ctx[2] <= 465);
    			add_location(article2, file$4, 73, 20, 3277);
    			attr_dev(div5, "class", "col-12 col-xl-6 mb-4 mt-lg-4 mt-xl-0 mt-md-4  pin-article-main");
    			add_location(div5, file$4, 72, 16, 3180);
    			attr_dev(section0, "class", "row justify-content-md-center mx-0 pt-3 bg-light shadow-radius-section");
    			add_location(section0, file$4, 43, 12, 1333);
    			attr_dev(img6, "class", "cu-image-com mr-1 ");
    			if (img6.src !== (img6_src_value = "image/afarine.jpg")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "alt", "");
    			add_location(img6, file$4, 95, 44, 4663);
    			attr_dev(div6, "class", "col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width");
    			add_location(div6, file$4, 94, 40, 4549);
    			set_style(i6, "color", "#048af7");
    			attr_dev(i6, "class", "fas fa-check-circle");
    			add_location(i6, file$4, 99, 125, 5142);
    			attr_dev(a6, "href", "magezine");
    			attr_dev(a6, "class", "title-post-link");
    			add_location(a6, file$4, 99, 52, 5069);
    			add_location(h60, file$4, 99, 48, 5065);
    			attr_dev(i7, "class", "fas fa-clock");
    			add_location(i7, file$4, 100, 80, 5290);
    			attr_dev(span3, "class", "show-time-custome");
    			add_location(span3, file$4, 100, 48, 5258);
    			attr_dev(div7, "class", "cu-intro mt-2");
    			add_location(div7, file$4, 98, 44, 4989);
    			attr_dev(div8, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-3 pr-md-4 pr-xl-3 mr-lg-0 mr-lg-1 mr-xl-0 justify-content-center custome-margin-right ");
    			add_location(div8, file$4, 97, 40, 4814);
    			attr_dev(div9, "class", "row ");
    			add_location(div9, file$4, 93, 36, 4490);
    			attr_dev(div10, "class", "col-11 col-md-11");
    			add_location(div10, file$4, 92, 32, 4422);
    			attr_dev(i8, "class", "fas fa-ellipsis-h -1 ");
    			attr_dev(i8, "type", "button");
    			attr_dev(i8, "data-toggle", "dropdown");
    			add_location(i8, file$4, 106, 36, 5676);
    			attr_dev(i9, "class", "far fa-bookmark");
    			add_location(i9, file$4, 108, 120, 5948);
    			attr_dev(a7, "class", "dropdown-item");
    			attr_dev(a7, "href", "#");
    			add_location(a7, file$4, 108, 85, 5913);
    			add_location(li0, file$4, 108, 40, 5868);
    			attr_dev(i10, "class", "fas fa-share-alt");
    			add_location(i10, file$4, 109, 78, 6083);
    			attr_dev(a8, "class", "dropdown-item");
    			attr_dev(a8, "href", "#");
    			add_location(a8, file$4, 109, 44, 6049);
    			add_location(li1, file$4, 109, 40, 6045);
    			attr_dev(i11, "class", "fas fa-flag");
    			add_location(i11, file$4, 110, 78, 6218);
    			attr_dev(a9, "class", "dropdown-item");
    			attr_dev(a9, "href", "#");
    			add_location(a9, file$4, 110, 44, 6184);
    			add_location(li2, file$4, 110, 40, 6180);
    			attr_dev(ul0, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul0, file$4, 107, 36, 5787);
    			attr_dev(div11, "class", "report navbar col-1 ml-0 pl-0 pr-3 pr-sm-4 pr-md-1 pr-lg-3 pr-xl-4 dropdown");
    			add_location(div11, file$4, 105, 32, 5550);
    			attr_dev(div12, "class", "row justify-content-between p-2 pl-4 pl-md-2 ");
    			add_location(div12, file$4, 91, 28, 4330);
    			attr_dev(div13, "class", "col-12");
    			add_location(div13, file$4, 90, 24, 4281);
    			attr_dev(a10, "class", "title-post-link");
    			attr_dev(a10, "href", "magezine/show-detail");
    			add_location(a10, file$4, 117, 72, 6559);
    			attr_dev(h30, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h30, file$4, 117, 28, 6515);
    			attr_dev(div14, "class", "col-12 p-0");
    			add_location(div14, file$4, 116, 24, 6462);
    			if (img7.src !== (img7_src_value = "image/30.jpg")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img7, "alt", "");
    			add_location(img7, file$4, 120, 28, 6787);
    			attr_dev(div15, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div15, file$4, 119, 24, 6701);
    			attr_dev(span4, "class", "content d-inline");
    			add_location(span4, file$4, 123, 32, 7005);
    			attr_dev(span5, "class", "read-more-custom");
    			attr_dev(span5, "onclick", "readMore(this)");
    			set_style(span5, "cursor", "pointer");
    			add_location(span5, file$4, 135, 32, 10396);
    			attr_dev(button0, "class", "btn btn-sm btn-danger col-12 my-1 p-1 offset-0 font-family");
    			add_location(button0, file$4, 139, 44, 10790);
    			attr_dev(a11, "href", "magezine/show-detail");
    			attr_dev(a11, "class", "col-3 col-md-2 px-0");
    			add_location(a11, file$4, 138, 40, 10686);
    			attr_dev(div16, "class", "row pl-0 ml-0 pt-2 justify-content-end ");
    			add_location(div16, file$4, 137, 36, 10592);
    			attr_dev(span6, "class", "read-more ");
    			add_location(span6, file$4, 136, 32, 10530);
    			attr_dev(p0, "class", "post-text col-12 mt-3 post-text");
    			add_location(p0, file$4, 122, 28, 6929);
    			attr_dev(img8, "class", "personal-img");
    			if (img8.src !== (img8_src_value = "image/1.jpeg")) attr_dev(img8, "src", img8_src_value);
    			attr_dev(img8, "alt", "");
    			add_location(img8, file$4, 148, 32, 11248);
    			attr_dev(span7, "class", "personal-name");
    			add_location(span7, file$4, 149, 32, 11333);
    			attr_dev(a12, "class", "a-clicked");
    			attr_dev(a12, "href", "profile");
    			add_location(a12, file$4, 147, 28, 11179);
    			attr_dev(i12, "class", "fas fa-eye");
    			add_location(i12, file$4, 151, 52, 11484);
    			attr_dev(div17, "class", "view-count");
    			add_location(div17, file$4, 151, 28, 11460);
    			attr_dev(div18, "class", "col-12 mb-1 author-show-box pt-1");
    			add_location(div18, file$4, 146, 24, 11104);
    			attr_dev(article3, "class", "p-0  shadow-radius-section shadow-section mb-4 bg-light");
    			add_location(article3, file$4, 89, 20, 4183);
    			attr_dev(img9, "class", "cu-image-com mr-1 ");
    			if (img9.src !== (img9_src_value = "image/afarine.jpg")) attr_dev(img9, "src", img9_src_value);
    			attr_dev(img9, "alt", "");
    			add_location(img9, file$4, 160, 44, 12082);
    			attr_dev(div19, "class", "col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width");
    			add_location(div19, file$4, 159, 40, 11968);
    			set_style(i13, "color", "#048af7");
    			attr_dev(i13, "class", "fas fa-check-circle");
    			add_location(i13, file$4, 164, 125, 12561);
    			attr_dev(a13, "href", "magezine");
    			attr_dev(a13, "class", "title-post-link");
    			add_location(a13, file$4, 164, 52, 12488);
    			add_location(h61, file$4, 164, 48, 12484);
    			attr_dev(i14, "class", "fas fa-clock");
    			add_location(i14, file$4, 165, 80, 12709);
    			attr_dev(span8, "class", "show-time-custome");
    			add_location(span8, file$4, 165, 48, 12677);
    			attr_dev(div20, "class", "cu-intro mt-2");
    			add_location(div20, file$4, 163, 44, 12408);
    			attr_dev(div21, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-3 pr-md-4 pr-xl-3 mr-lg-0 mr-lg-1 mr-xl-0 justify-content-center custome-margin-right ");
    			add_location(div21, file$4, 162, 40, 12233);
    			attr_dev(div22, "class", "row ");
    			add_location(div22, file$4, 158, 36, 11909);
    			attr_dev(div23, "class", "col-11 col-md-11");
    			add_location(div23, file$4, 157, 32, 11841);
    			attr_dev(i15, "class", "fas fa-ellipsis-h -1 ");
    			attr_dev(i15, "type", "button");
    			attr_dev(i15, "data-toggle", "dropdown");
    			add_location(i15, file$4, 171, 36, 13095);
    			attr_dev(i16, "class", "far fa-bookmark");
    			add_location(i16, file$4, 173, 120, 13367);
    			attr_dev(a14, "class", "dropdown-item");
    			attr_dev(a14, "href", "#");
    			add_location(a14, file$4, 173, 85, 13332);
    			add_location(li3, file$4, 173, 40, 13287);
    			attr_dev(i17, "class", "fas fa-share-alt");
    			add_location(i17, file$4, 174, 78, 13502);
    			attr_dev(a15, "class", "dropdown-item");
    			attr_dev(a15, "href", "#");
    			add_location(a15, file$4, 174, 44, 13468);
    			add_location(li4, file$4, 174, 40, 13464);
    			attr_dev(i18, "class", "fas fa-flag");
    			add_location(i18, file$4, 175, 78, 13637);
    			attr_dev(a16, "class", "dropdown-item");
    			attr_dev(a16, "href", "#");
    			add_location(a16, file$4, 175, 44, 13603);
    			add_location(li5, file$4, 175, 40, 13599);
    			attr_dev(ul1, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul1, file$4, 172, 36, 13206);
    			attr_dev(div24, "class", "report navbar col-1 ml-0 pl-0 pr-3 pr-sm-4 pr-md-1 pr-lg-3 pr-xl-4 dropdown");
    			add_location(div24, file$4, 170, 32, 12969);
    			attr_dev(div25, "class", "row justify-content-between p-2 pl-4 pl-md-2 ");
    			add_location(div25, file$4, 156, 28, 11749);
    			attr_dev(div26, "class", "col-12");
    			add_location(div26, file$4, 155, 24, 11700);
    			attr_dev(a17, "class", "title-post-link");
    			attr_dev(a17, "href", "magezine/show-detail");
    			add_location(a17, file$4, 182, 72, 13978);
    			attr_dev(h31, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h31, file$4, 182, 28, 13934);
    			attr_dev(div27, "class", "col-12 p-0");
    			add_location(div27, file$4, 181, 24, 13881);
    			if (img10.src !== (img10_src_value = "image/30.jpg")) attr_dev(img10, "src", img10_src_value);
    			attr_dev(img10, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img10, "alt", "");
    			add_location(img10, file$4, 185, 28, 14206);
    			attr_dev(div28, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div28, file$4, 184, 24, 14120);
    			attr_dev(span9, "class", "content d-inline");
    			add_location(span9, file$4, 188, 32, 14424);
    			attr_dev(span10, "class", "read-more-custom");
    			attr_dev(span10, "onclick", "readMore(this)");
    			set_style(span10, "cursor", "pointer");
    			add_location(span10, file$4, 200, 32, 17804);
    			attr_dev(button1, "class", "btn btn-sm btn-danger col-12 my-1 p-1 offset-0 font-family");
    			add_location(button1, file$4, 204, 44, 18198);
    			attr_dev(a18, "href", "magezine/show-detail");
    			attr_dev(a18, "class", "col-3 col-md-2 px-0");
    			add_location(a18, file$4, 203, 40, 18094);
    			attr_dev(div29, "class", "row pl-0 ml-0 pt-2 justify-content-end ");
    			add_location(div29, file$4, 202, 36, 18000);
    			attr_dev(span11, "class", "read-more ");
    			add_location(span11, file$4, 201, 32, 17938);
    			attr_dev(p1, "class", "post-text col-12 mt-3 post-text");
    			add_location(p1, file$4, 187, 28, 14348);
    			attr_dev(img11, "class", "personal-img");
    			if (img11.src !== (img11_src_value = "image/1.jpeg")) attr_dev(img11, "src", img11_src_value);
    			attr_dev(img11, "alt", "");
    			add_location(img11, file$4, 213, 32, 18656);
    			attr_dev(span12, "class", "personal-name");
    			add_location(span12, file$4, 214, 32, 18741);
    			attr_dev(a19, "class", "a-clicked");
    			attr_dev(a19, "href", "profile");
    			add_location(a19, file$4, 212, 28, 18587);
    			attr_dev(i19, "class", "fas fa-eye");
    			add_location(i19, file$4, 216, 52, 18892);
    			attr_dev(div30, "class", "view-count");
    			add_location(div30, file$4, 216, 28, 18868);
    			attr_dev(div31, "class", "col-12 mb-1 author-show-box pt-1");
    			add_location(div31, file$4, 211, 24, 18512);
    			attr_dev(article4, "class", "p-0  shadow-radius-section shadow-section mb-4 bg-light");
    			add_location(article4, file$4, 154, 20, 11602);
    			attr_dev(img12, "class", "cu-image-com mr-1 ");
    			if (img12.src !== (img12_src_value = "image/afarine.jpg")) attr_dev(img12, "src", img12_src_value);
    			attr_dev(img12, "alt", "");
    			add_location(img12, file$4, 225, 44, 19490);
    			attr_dev(div32, "class", "col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width");
    			add_location(div32, file$4, 224, 40, 19376);
    			set_style(i20, "color", "#048af7");
    			attr_dev(i20, "class", "fas fa-check-circle");
    			add_location(i20, file$4, 229, 125, 19969);
    			attr_dev(a20, "href", "magezine");
    			attr_dev(a20, "class", "title-post-link");
    			add_location(a20, file$4, 229, 52, 19896);
    			add_location(h62, file$4, 229, 48, 19892);
    			attr_dev(i21, "class", "fas fa-clock");
    			add_location(i21, file$4, 230, 80, 20117);
    			attr_dev(span13, "class", "show-time-custome");
    			add_location(span13, file$4, 230, 48, 20085);
    			attr_dev(div33, "class", "cu-intro mt-2");
    			add_location(div33, file$4, 228, 44, 19816);
    			attr_dev(div34, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-3 pr-md-4 pr-xl-3 mr-lg-0 mr-lg-1 mr-xl-0 justify-content-center custome-margin-right ");
    			add_location(div34, file$4, 227, 40, 19641);
    			attr_dev(div35, "class", "row ");
    			add_location(div35, file$4, 223, 36, 19317);
    			attr_dev(div36, "class", "col-11 col-md-11");
    			add_location(div36, file$4, 222, 32, 19249);
    			attr_dev(i22, "class", "fas fa-ellipsis-h -1 ");
    			attr_dev(i22, "type", "button");
    			attr_dev(i22, "data-toggle", "dropdown");
    			add_location(i22, file$4, 236, 36, 20503);
    			attr_dev(i23, "class", "far fa-bookmark");
    			add_location(i23, file$4, 238, 120, 20775);
    			attr_dev(a21, "class", "dropdown-item");
    			attr_dev(a21, "href", "#");
    			add_location(a21, file$4, 238, 85, 20740);
    			add_location(li6, file$4, 238, 40, 20695);
    			attr_dev(i24, "class", "fas fa-share-alt");
    			add_location(i24, file$4, 239, 78, 20910);
    			attr_dev(a22, "class", "dropdown-item");
    			attr_dev(a22, "href", "#");
    			add_location(a22, file$4, 239, 44, 20876);
    			add_location(li7, file$4, 239, 40, 20872);
    			attr_dev(i25, "class", "fas fa-flag");
    			add_location(i25, file$4, 240, 78, 21045);
    			attr_dev(a23, "class", "dropdown-item");
    			attr_dev(a23, "href", "#");
    			add_location(a23, file$4, 240, 44, 21011);
    			add_location(li8, file$4, 240, 40, 21007);
    			attr_dev(ul2, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul2, file$4, 237, 36, 20614);
    			attr_dev(div37, "class", "report navbar col-1 ml-0 pl-0 pr-3 pr-sm-4 pr-md-1 pr-lg-3 pr-xl-4 dropdown");
    			add_location(div37, file$4, 235, 32, 20377);
    			attr_dev(div38, "class", "row justify-content-between p-2 pl-4 pl-md-2 ");
    			add_location(div38, file$4, 221, 28, 19157);
    			attr_dev(div39, "class", "col-12");
    			add_location(div39, file$4, 220, 24, 19108);
    			attr_dev(a24, "class", "title-post-link");
    			attr_dev(a24, "href", "magezine/show-detail");
    			add_location(a24, file$4, 247, 72, 21386);
    			attr_dev(h32, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h32, file$4, 247, 28, 21342);
    			attr_dev(div40, "class", "col-12 p-0");
    			add_location(div40, file$4, 246, 24, 21289);
    			if (img13.src !== (img13_src_value = "image/30.jpg")) attr_dev(img13, "src", img13_src_value);
    			attr_dev(img13, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img13, "alt", "");
    			add_location(img13, file$4, 250, 28, 21614);
    			attr_dev(div41, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div41, file$4, 249, 24, 21528);
    			attr_dev(span14, "class", "content d-inline");
    			add_location(span14, file$4, 253, 32, 21832);
    			attr_dev(span15, "class", "read-more-custom");
    			attr_dev(span15, "onclick", "readMore(this)");
    			set_style(span15, "cursor", "pointer");
    			add_location(span15, file$4, 259, 32, 23442);
    			attr_dev(button2, "class", "btn btn-sm btn-danger col-12 my-1 p-1 offset-0 font-family");
    			add_location(button2, file$4, 263, 44, 23836);
    			attr_dev(a25, "href", "magezine/show-detail");
    			attr_dev(a25, "class", "col-3 col-md-2 px-0");
    			add_location(a25, file$4, 262, 40, 23732);
    			attr_dev(div42, "class", "row pl-0 ml-0 pt-2 justify-content-end ");
    			add_location(div42, file$4, 261, 36, 23638);
    			attr_dev(span16, "class", "read-more ");
    			add_location(span16, file$4, 260, 32, 23576);
    			attr_dev(p2, "class", "post-text col-12 mt-3 post-text");
    			add_location(p2, file$4, 252, 28, 21756);
    			attr_dev(img14, "class", "personal-img");
    			if (img14.src !== (img14_src_value = "image/1.jpeg")) attr_dev(img14, "src", img14_src_value);
    			attr_dev(img14, "alt", "");
    			add_location(img14, file$4, 272, 32, 24294);
    			attr_dev(span17, "class", "personal-name");
    			add_location(span17, file$4, 273, 32, 24379);
    			attr_dev(a26, "class", "a-clicked");
    			attr_dev(a26, "href", "profile");
    			add_location(a26, file$4, 271, 28, 24225);
    			attr_dev(i26, "class", "fas fa-eye");
    			add_location(i26, file$4, 275, 52, 24530);
    			attr_dev(div43, "class", "view-count");
    			add_location(div43, file$4, 275, 28, 24506);
    			attr_dev(div44, "class", "col-12 mb-1 author-show-box pt-1");
    			add_location(div44, file$4, 270, 24, 24150);
    			attr_dev(article5, "class", "p-0  shadow-radius-section shadow-section mb-4 bg-light");
    			add_location(article5, file$4, 219, 20, 19010);
    			attr_dev(div45, "class", "col-12 p-0 main-article");
    			add_location(div45, file$4, 88, 16, 4125);
    			attr_dev(section1, "class", "row mx-0 mt-3 mr-0 pt-0 bg-light ");
    			add_location(section1, file$4, 87, 12, 4057);
    			attr_dev(aside1, "class", "col-12 col-md-6 mx-2 order-first order-md-0 ");
    			add_location(aside1, file$4, 42, 8, 1260);
    			attr_dev(aside2, "class", "col-12 col-md-2 mx-1 mt-5 mt-md-0 bg-light shadow-radius-section");
    			add_location(aside2, file$4, 281, 8, 24699);
    			attr_dev(div46, "class", "row justify-content-center mx-lg-2");
    			add_location(div46, file$4, 40, 4, 1100);
    			attr_dev(main, "class", "container-fluid pin-parent ");
    			add_location(main, file$4, 39, 0, 1036);
    			add_location(br0, file$4, 286, 0, 24828);
    			attr_dev(hr, "class", "col-10 offset-1");
    			add_location(hr, file$4, 286, 4, 24832);
    			add_location(br1, file$4, 286, 32, 24860);
    			add_location(br2, file$4, 286, 36, 24864);
    			add_location(br3, file$4, 286, 40, 24868);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div46);
    			append_dev(div46, aside0);
    			append_dev(div46, t2);
    			append_dev(div46, aside1);
    			append_dev(aside1, section0);
    			append_dev(section0, div1);
    			append_dev(div1, article0);
    			append_dev(article0, img0);
    			append_dev(article0, t3);
    			append_dev(article0, a0);
    			append_dev(a0, h50);
    			append_dev(article0, t5);
    			append_dev(article0, a1);
    			append_dev(a1, img1);
    			append_dev(article0, t6);
    			append_dev(article0, div0);
    			append_dev(div0, span0);
    			append_dev(span0, t7);
    			append_dev(span0, i0);
    			append_dev(div0, t8);
    			append_dev(div0, i1);
    			append_dev(div0, t9);
    			append_dev(section0, t10);
    			append_dev(section0, div3);
    			append_dev(div3, article1);
    			append_dev(article1, img2);
    			append_dev(article1, t11);
    			append_dev(article1, a2);
    			append_dev(a2, h51);
    			append_dev(article1, t13);
    			append_dev(article1, a3);
    			append_dev(a3, img3);
    			append_dev(article1, t14);
    			append_dev(article1, div2);
    			append_dev(div2, span1);
    			append_dev(span1, t15);
    			append_dev(span1, i2);
    			append_dev(div2, t16);
    			append_dev(div2, i3);
    			append_dev(div2, t17);
    			append_dev(section0, t18);
    			append_dev(section0, div5);
    			append_dev(div5, article2);
    			append_dev(article2, img4);
    			append_dev(article2, t19);
    			append_dev(article2, a4);
    			append_dev(a4, h52);
    			append_dev(article2, t21);
    			append_dev(article2, a5);
    			append_dev(a5, img5);
    			append_dev(article2, t22);
    			append_dev(article2, div4);
    			append_dev(div4, span2);
    			append_dev(span2, t23);
    			append_dev(span2, i4);
    			append_dev(div4, t24);
    			append_dev(div4, i5);
    			append_dev(div4, t25);
    			append_dev(aside1, t26);
    			append_dev(aside1, section1);
    			append_dev(section1, div45);
    			append_dev(div45, article3);
    			append_dev(article3, div13);
    			append_dev(div13, div12);
    			append_dev(div12, div10);
    			append_dev(div10, div9);
    			append_dev(div9, div6);
    			append_dev(div6, img6);
    			append_dev(div9, t27);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, h60);
    			append_dev(h60, a6);
    			append_dev(a6, t28);
    			append_dev(a6, i6);
    			append_dev(div7, t29);
    			append_dev(div7, span3);
    			append_dev(span3, i7);
    			append_dev(span3, t30);
    			append_dev(div12, t31);
    			append_dev(div12, div11);
    			append_dev(div11, i8);
    			append_dev(div11, t32);
    			append_dev(div11, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a7);
    			append_dev(a7, i9);
    			append_dev(a7, t33);
    			append_dev(ul0, t34);
    			append_dev(ul0, li1);
    			append_dev(li1, a8);
    			append_dev(a8, i10);
    			append_dev(a8, t35);
    			append_dev(ul0, t36);
    			append_dev(ul0, li2);
    			append_dev(li2, a9);
    			append_dev(a9, i11);
    			append_dev(a9, t37);
    			append_dev(article3, t38);
    			append_dev(article3, div14);
    			append_dev(div14, h30);
    			append_dev(h30, a10);
    			append_dev(article3, t40);
    			append_dev(article3, div15);
    			append_dev(div15, img7);
    			append_dev(article3, t41);
    			append_dev(article3, p0);
    			append_dev(p0, span4);
    			append_dev(p0, t43);
    			append_dev(p0, span5);
    			append_dev(p0, t45);
    			append_dev(p0, span6);
    			append_dev(span6, div16);
    			append_dev(div16, a11);
    			append_dev(a11, button0);
    			append_dev(article3, t47);
    			append_dev(article3, div18);
    			append_dev(div18, a12);
    			append_dev(a12, img8);
    			append_dev(a12, t48);
    			append_dev(a12, span7);
    			append_dev(a12, t50);
    			append_dev(div18, t51);
    			append_dev(div18, div17);
    			append_dev(div17, i12);
    			append_dev(div17, t52);
    			append_dev(div45, t53);
    			append_dev(div45, article4);
    			append_dev(article4, div26);
    			append_dev(div26, div25);
    			append_dev(div25, div23);
    			append_dev(div23, div22);
    			append_dev(div22, div19);
    			append_dev(div19, img9);
    			append_dev(div22, t54);
    			append_dev(div22, div21);
    			append_dev(div21, div20);
    			append_dev(div20, h61);
    			append_dev(h61, a13);
    			append_dev(a13, t55);
    			append_dev(a13, i13);
    			append_dev(div20, t56);
    			append_dev(div20, span8);
    			append_dev(span8, i14);
    			append_dev(span8, t57);
    			append_dev(div25, t58);
    			append_dev(div25, div24);
    			append_dev(div24, i15);
    			append_dev(div24, t59);
    			append_dev(div24, ul1);
    			append_dev(ul1, li3);
    			append_dev(li3, a14);
    			append_dev(a14, i16);
    			append_dev(a14, t60);
    			append_dev(ul1, t61);
    			append_dev(ul1, li4);
    			append_dev(li4, a15);
    			append_dev(a15, i17);
    			append_dev(a15, t62);
    			append_dev(ul1, t63);
    			append_dev(ul1, li5);
    			append_dev(li5, a16);
    			append_dev(a16, i18);
    			append_dev(a16, t64);
    			append_dev(article4, t65);
    			append_dev(article4, div27);
    			append_dev(div27, h31);
    			append_dev(h31, a17);
    			append_dev(article4, t67);
    			append_dev(article4, div28);
    			append_dev(div28, img10);
    			append_dev(article4, t68);
    			append_dev(article4, p1);
    			append_dev(p1, span9);
    			append_dev(p1, t70);
    			append_dev(p1, span10);
    			append_dev(p1, t72);
    			append_dev(p1, span11);
    			append_dev(span11, div29);
    			append_dev(div29, a18);
    			append_dev(a18, button1);
    			append_dev(article4, t74);
    			append_dev(article4, div31);
    			append_dev(div31, a19);
    			append_dev(a19, img11);
    			append_dev(a19, t75);
    			append_dev(a19, span12);
    			append_dev(a19, t77);
    			append_dev(div31, t78);
    			append_dev(div31, div30);
    			append_dev(div30, i19);
    			append_dev(div30, t79);
    			append_dev(div45, t80);
    			append_dev(div45, article5);
    			append_dev(article5, div39);
    			append_dev(div39, div38);
    			append_dev(div38, div36);
    			append_dev(div36, div35);
    			append_dev(div35, div32);
    			append_dev(div32, img12);
    			append_dev(div35, t81);
    			append_dev(div35, div34);
    			append_dev(div34, div33);
    			append_dev(div33, h62);
    			append_dev(h62, a20);
    			append_dev(a20, t82);
    			append_dev(a20, i20);
    			append_dev(div33, t83);
    			append_dev(div33, span13);
    			append_dev(span13, i21);
    			append_dev(span13, t84);
    			append_dev(div38, t85);
    			append_dev(div38, div37);
    			append_dev(div37, i22);
    			append_dev(div37, t86);
    			append_dev(div37, ul2);
    			append_dev(ul2, li6);
    			append_dev(li6, a21);
    			append_dev(a21, i23);
    			append_dev(a21, t87);
    			append_dev(ul2, t88);
    			append_dev(ul2, li7);
    			append_dev(li7, a22);
    			append_dev(a22, i24);
    			append_dev(a22, t89);
    			append_dev(ul2, t90);
    			append_dev(ul2, li8);
    			append_dev(li8, a23);
    			append_dev(a23, i25);
    			append_dev(a23, t91);
    			append_dev(article5, t92);
    			append_dev(article5, div40);
    			append_dev(div40, h32);
    			append_dev(h32, a24);
    			append_dev(article5, t94);
    			append_dev(article5, div41);
    			append_dev(div41, img13);
    			append_dev(article5, t95);
    			append_dev(article5, p2);
    			append_dev(p2, span14);
    			append_dev(p2, t97);
    			append_dev(p2, span15);
    			append_dev(p2, t99);
    			append_dev(p2, span16);
    			append_dev(span16, div42);
    			append_dev(div42, a25);
    			append_dev(a25, button2);
    			append_dev(article5, t101);
    			append_dev(article5, div44);
    			append_dev(div44, a26);
    			append_dev(a26, img14);
    			append_dev(a26, t102);
    			append_dev(a26, span17);
    			append_dev(a26, t104);
    			append_dev(div44, t105);
    			append_dev(div44, div43);
    			append_dev(div43, i26);
    			append_dev(div43, t106);
    			append_dev(div46, t107);
    			append_dev(div46, aside2);
    			insert_dev(target, t109, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, hr, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, br2, anchor);
    			insert_dev(target, br3, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window_1, "scroll", () => {
    						scrolling = true;
    						clearTimeout(scrolling_timeout);
    						scrolling_timeout = setTimeout(clear_scrolling, 100);
    						/*onwindowscroll*/ ctx[6]();
    					}),
    					listen_dev(window_1, "resize", /*onwindowresize*/ ctx[7])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*y*/ 1 && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window_1.pageXOffset, /*y*/ ctx[0]);
    				scrolling_timeout = setTimeout(clear_scrolling, 100);
    			}

    			if (dirty & /*h*/ 4) {
    				toggle_class(article0, "pin-article-height", /*h*/ ctx[2] <= 465);
    			}

    			if (dirty & /*h*/ 4) {
    				toggle_class(article1, "pin-article-height", /*h*/ ctx[2] <= 465);
    			}

    			if (dirty & /*h*/ 4) {
    				toggle_class(article2, "pin-article-height", /*h*/ ctx[2] <= 465);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			add_render_callback(() => {
    				if (!main_transition) main_transition = create_bidirectional_transition(main, scale, {}, true);
    				main_transition.run(1);
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			if (!main_transition) main_transition = create_bidirectional_transition(main, scale, {}, false);
    			main_transition.run(0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			if (detaching && main_transition) main_transition.end();
    			if (detaching) detach_dev(t109);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(hr);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(br2);
    			if (detaching) detach_dev(br3);
    			mounted = false;
    			run_all(dispose);
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Home", slots, []);
    	let { url = "" } = $$props;
    	let { id = 1 } = $$props;
    	let { y } = $$props;
    	let { x } = $$props;
    	let { h } = $$props;
    	let { post = [] } = $$props;

    	onMount(async () => {
    		const res = await fetch("http://localhost:8000/post/page/1/");
    		$$invalidate(3, post = await res.json());
    		$$invalidate(3, post = post.data);
    	});

    	var currentLocation = window.location.href;
    	var splitUrl = currentLocation.split("/");
    	var lastSugment = splitUrl[splitUrl.length - 1];
    	const writable_props = ["url", "id", "y", "x", "h", "post"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	function onwindowscroll() {
    		$$invalidate(0, y = window_1.pageYOffset);
    	}

    	function onwindowresize() {
    		$$invalidate(1, x = window_1.innerWidth);
    		$$invalidate(2, h = window_1.innerHeight);
    	}

    	$$self.$$set = $$props => {
    		if ("url" in $$props) $$invalidate(4, url = $$props.url);
    		if ("id" in $$props) $$invalidate(5, id = $$props.id);
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    		if ("x" in $$props) $$invalidate(1, x = $$props.x);
    		if ("h" in $$props) $$invalidate(2, h = $$props.h);
    		if ("post" in $$props) $$invalidate(3, post = $$props.post);
    	};

    	$$self.$capture_state = () => ({
    		Magezine,
    		onMount,
    		fade,
    		slide,
    		scale,
    		fly,
    		circIn,
    		Router,
    		Link,
    		Route,
    		about: About,
    		showDetail: Show_detail,
    		url,
    		id,
    		y,
    		x,
    		h,
    		post,
    		currentLocation,
    		splitUrl,
    		lastSugment
    	});

    	$$self.$inject_state = $$props => {
    		if ("url" in $$props) $$invalidate(4, url = $$props.url);
    		if ("id" in $$props) $$invalidate(5, id = $$props.id);
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    		if ("x" in $$props) $$invalidate(1, x = $$props.x);
    		if ("h" in $$props) $$invalidate(2, h = $$props.h);
    		if ("post" in $$props) $$invalidate(3, post = $$props.post);
    		if ("currentLocation" in $$props) currentLocation = $$props.currentLocation;
    		if ("splitUrl" in $$props) splitUrl = $$props.splitUrl;
    		if ("lastSugment" in $$props) lastSugment = $$props.lastSugment;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [y, x, h, post, url, id, onwindowscroll, onwindowresize];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { url: 4, id: 5, y: 0, x: 1, h: 2, post: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*y*/ ctx[0] === undefined && !("y" in props)) {
    			console.warn("<Home> was created without expected prop 'y'");
    		}

    		if (/*x*/ ctx[1] === undefined && !("x" in props)) {
    			console.warn("<Home> was created without expected prop 'x'");
    		}

    		if (/*h*/ ctx[2] === undefined && !("h" in props)) {
    			console.warn("<Home> was created without expected prop 'h'");
    		}
    	}

    	get url() {
    		throw new Error("<Home>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Home>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Home>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Home>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get y() {
    		throw new Error("<Home>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<Home>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get x() {
    		throw new Error("<Home>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set x(value) {
    		throw new Error("<Home>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get h() {
    		throw new Error("<Home>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set h(value) {
    		throw new Error("<Home>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get post() {
    		throw new Error("<Home>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set post(value) {
    		throw new Error("<Home>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/layout/Nav.svelte generated by Svelte v3.38.3 */

    const { console: console_1 } = globals;
    const file$3 = "src/layout/Nav.svelte";

    // (39:36) <Link to="/" class="menu-item-link-color">
    function create_default_slot_5(ctx) {
    	let div;
    	let i;
    	let span;
    	let br;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i = element("i");
    			span = element("span");
    			br = element("br");
    			t = text("خانه");
    			add_location(br, file$3, 40, 133, 1700);
    			attr_dev(span, "class", "menu-item d-none d-md-inline");
    			add_location(span, file$3, 40, 90, 1657);
    			attr_dev(i, "class", "fas fa-home  p-0 m-0 mt-2 mt-md-0");
    			add_location(i, file$3, 40, 44, 1611);
    			set_style(div, "height", "25px");
    			attr_dev(div, "class", "col-12 mt-2 text-center px-0 menu-icon pb-0 mb-0");
    			add_location(div, file$3, 39, 40, 1482);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i);
    			append_dev(i, span);
    			append_dev(span, br);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_5.name,
    		type: "slot",
    		source: "(39:36) <Link to=\\\"/\\\" class=\\\"menu-item-link-color\\\">",
    		ctx
    	});

    	return block;
    }

    // (46:36) <Link to="profile" class="menu-item-link-color">
    function create_default_slot_4(ctx) {
    	let div;
    	let i;
    	let span;
    	let br;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i = element("i");
    			span = element("span");
    			br = element("br");
    			t = text("پروفایل فرد");
    			add_location(br, file$3, 47, 138, 2251);
    			attr_dev(span, "class", "menu-item d-none d-md-inline");
    			add_location(span, file$3, 47, 95, 2208);
    			attr_dev(i, "class", "fas fa-mail-bulk p-0 m-0 mt-2 mt-md-0 ");
    			add_location(i, file$3, 47, 44, 2157);
    			set_style(div, "height", "25px");
    			attr_dev(div, "class", "col-12 mt-2 text-center px-0 menu-icon pb-0 mb-0");
    			add_location(div, file$3, 46, 40, 2028);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i);
    			append_dev(i, span);
    			append_dev(span, br);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(46:36) <Link to=\\\"profile\\\" class=\\\"menu-item-link-color\\\">",
    		ctx
    	});

    	return block;
    }

    // (54:36) <Link class="menu-item-link-color" to="show-detail">
    function create_default_slot_3(ctx) {
    	let div;
    	let i;
    	let span;
    	let br;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i = element("i");
    			span = element("span");
    			br = element("br");
    			t = text("جزيیات");
    			add_location(br, file$3, 55, 144, 2854);
    			attr_dev(span, "class", "menu-item d-none d-md-inline");
    			add_location(span, file$3, 55, 101, 2811);
    			attr_dev(i, "class", "fas fa-info-circle ml-1 p-0 m-0 mt-2 mt-md-0");
    			add_location(i, file$3, 55, 44, 2754);
    			set_style(div, "height", "25px");
    			attr_dev(div, "class", "col-12 mt-2 text-center px-0 menu-icon pb-0 mb-0");
    			add_location(div, file$3, 54, 40, 2625);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i);
    			append_dev(i, span);
    			append_dev(span, br);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(54:36) <Link class=\\\"menu-item-link-color\\\" to=\\\"show-detail\\\">",
    		ctx
    	});

    	return block;
    }

    // (62:36) <Link class="menu-item-link-color" to="magezine">
    function create_default_slot_2(ctx) {
    	let div;
    	let i;
    	let span;
    	let br;
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i = element("i");
    			span = element("span");
    			br = element("br");
    			t = text("مجله");
    			add_location(br, file$3, 63, 140, 3444);
    			attr_dev(span, "class", "menu-item d-none d-md-inline");
    			add_location(span, file$3, 63, 97, 3401);
    			attr_dev(i, "class", "fas fa-feather ml-1 p-0 m-0 mt-2 mt-md-0");
    			add_location(i, file$3, 63, 44, 3348);
    			set_style(div, "height", "25px");
    			attr_dev(div, "class", "col-12 mt-2 text-center px-0 menu-icon pb-0 mb-0");
    			add_location(div, file$3, 62, 40, 3219);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i);
    			append_dev(i, span);
    			append_dev(span, br);
    			append_dev(span, t);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(62:36) <Link class=\\\"menu-item-link-color\\\" to=\\\"magezine\\\">",
    		ctx
    	});

    	return block;
    }

    // (80:20) <Link to="/">
    function create_default_slot_1(ctx) {
    	let div1;
    	let div0;
    	let span;
    	let t1;
    	let div2;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			span = element("span");
    			span.textContent = "اینولینکس";
    			t1 = space();
    			div2 = element("div");
    			img = element("img");
    			attr_dev(span, "class", "brand-icon-custome");
    			add_location(span, file$3, 82, 32, 4556);
    			attr_dev(div0, "class", "brand-text mx-0");
    			add_location(div0, file$3, 81, 28, 4494);
    			attr_dev(div1, "class", "col-7 ");
    			add_location(div1, file$3, 80, 24, 4445);
    			if (img.src !== (img_src_value = /*src*/ ctx[2])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "brand-icon mt-2");
    			attr_dev(img, "alt", "");
    			add_location(img, file$3, 86, 28, 4751);
    			attr_dev(div2, "class", "col-1 h-100");
    			add_location(div2, file$3, 85, 24, 4697);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, span);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, img);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*src*/ 4 && img.src !== (img_src_value = /*src*/ ctx[2])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(80:20) <Link to=\\\"/\\\">",
    		ctx
    	});

    	return block;
    }

    // (28:0) <Router url="{url}">
    function create_default_slot(ctx) {
    	let header;
    	let nav;
    	let div12;
    	let div10;
    	let div9;
    	let div8;
    	let div7;
    	let div0;
    	let link0;
    	let t0;
    	let div1;
    	let link1;
    	let t1;
    	let div2;
    	let link2;
    	let t2;
    	let div3;
    	let link3;
    	let t3;
    	let div6;
    	let div5;
    	let div4;
    	let i1;
    	let span;
    	let br;
    	let i0;
    	let t4;
    	let t5;
    	let div11;
    	let link4;
    	let t6;
    	let div13;
    	let route0;
    	let t7;
    	let route1;
    	let t8;
    	let route2;
    	let t9;
    	let route3;
    	let t10;
    	let route4;
    	let t11;
    	let route5;
    	let t12;
    	let route6;
    	let t13;
    	let route7;
    	let current;

    	link0 = new Link({
    			props: {
    				to: "/",
    				class: "menu-item-link-color",
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	link1 = new Link({
    			props: {
    				to: "profile",
    				class: "menu-item-link-color",
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	link2 = new Link({
    			props: {
    				class: "menu-item-link-color",
    				to: "show-detail",
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	link3 = new Link({
    			props: {
    				class: "menu-item-link-color",
    				to: "magezine",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	link4 = new Link({
    			props: {
    				to: "/",
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route0 = new Route({
    			props: { path: "contact", component: Contact },
    			$$inline: true
    		});

    	route1 = new Route({
    			props: { path: "about", component: About },
    			$$inline: true
    		});

    	route2 = new Route({
    			props: { path: "/", component: Home },
    			$$inline: true
    		});

    	route3 = new Route({
    			props: { path: "profile", component: Profile },
    			$$inline: true
    		});

    	route4 = new Route({
    			props: { path: "magezine", component: Magezine },
    			$$inline: true
    		});

    	route5 = new Route({
    			props: {
    				path: "profile/show-detail",
    				component: Show_detail
    			},
    			$$inline: true
    		});

    	route6 = new Route({
    			props: {
    				path: "magezine/show-detail",
    				component: Show_detail
    			},
    			$$inline: true
    		});

    	route7 = new Route({
    			props: {
    				path: "show-detail",
    				component: Show_detail
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			header = element("header");
    			nav = element("nav");
    			div12 = element("div");
    			div10 = element("div");
    			div9 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			div0 = element("div");
    			create_component(link0.$$.fragment);
    			t0 = space();
    			div1 = element("div");
    			create_component(link1.$$.fragment);
    			t1 = space();
    			div2 = element("div");
    			create_component(link2.$$.fragment);
    			t2 = space();
    			div3 = element("div");
    			create_component(link3.$$.fragment);
    			t3 = space();
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			i1 = element("i");
    			span = element("span");
    			br = element("br");
    			i0 = element("i");
    			t4 = text(" ابزار");
    			t5 = space();
    			div11 = element("div");
    			create_component(link4.$$.fragment);
    			t6 = space();
    			div13 = element("div");
    			create_component(route0.$$.fragment);
    			t7 = space();
    			create_component(route1.$$.fragment);
    			t8 = space();
    			create_component(route2.$$.fragment);
    			t9 = space();
    			create_component(route3.$$.fragment);
    			t10 = space();
    			create_component(route4.$$.fragment);
    			t11 = space();
    			create_component(route5.$$.fragment);
    			t12 = space();
    			create_component(route6.$$.fragment);
    			t13 = space();
    			create_component(route7.$$.fragment);
    			attr_dev(div0, "class", "col-2 ");
    			add_location(div0, file$3, 37, 32, 1342);
    			attr_dev(div1, "class", "col-2");
    			add_location(div1, file$3, 44, 32, 1883);
    			attr_dev(div2, "class", "col-2  ");
    			add_location(div2, file$3, 52, 32, 2474);
    			attr_dev(div3, "class", "col-2  ");
    			add_location(div3, file$3, 60, 32, 3071);
    			add_location(br, file$3, 70, 140, 4032);
    			attr_dev(i0, "class", "fas fa-sort-down");
    			add_location(i0, file$3, 70, 144, 4036);
    			attr_dev(span, "class", "menu-item d-none d-md-inline");
    			add_location(span, file$3, 70, 97, 3989);
    			attr_dev(i1, "class", "fas fa-toolbox ml-1 p-0 m-0 mt-2 mt-md-0");
    			add_location(i1, file$3, 70, 44, 3936);
    			set_style(div4, "height", "25px");
    			attr_dev(div4, "class", "col-12 mt-2 text-center px-0 menu-icon pb-0 mb-0 dropdown");
    			add_location(div4, file$3, 69, 40, 3798);
    			attr_dev(div5, "class", "menu-item-link-color");
    			add_location(div5, file$3, 68, 36, 3723);
    			attr_dev(div6, "class", "col-2 ");
    			attr_dev(div6, "data-toggle", "modal");
    			attr_dev(div6, "data-target", "#mod1");
    			add_location(div6, file$3, 67, 32, 3626);
    			attr_dev(div7, "class", "menu-main-element row justify-content-start mt-1");
    			set_style(div7, "direction", "rtl");
    			set_style(div7, "text-align", "center");
    			add_location(div7, file$3, 36, 28, 1204);
    			attr_dev(div8, "class", "col-12");
    			add_location(div8, file$3, 34, 24, 1126);
    			attr_dev(div9, "class", "row ");
    			add_location(div9, file$3, 33, 20, 1083);
    			attr_dev(div10, "class", "col-7 col-sm-7 col-custom  px-0");
    			add_location(div10, file$3, 32, 16, 1017);
    			attr_dev(div11, "class", "col-3 col-md-2 pl-2 ");
    			add_location(div11, file$3, 78, 16, 4352);
    			attr_dev(div12, "class", "row justify-content-end ");
    			add_location(div12, file$3, 31, 12, 961);
    			attr_dev(nav, "class", "container-fluid pb-0 ");
    			add_location(nav, file$3, 30, 8, 911);
    			attr_dev(header, "class", "sticky-top ");
    			toggle_class(header, "nav-custome-bottom", /*y*/ ctx[1] <= 600);
    			add_location(header, file$3, 29, 4, 839);
    			add_location(div13, file$3, 94, 4, 4949);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, nav);
    			append_dev(nav, div12);
    			append_dev(div12, div10);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div0);
    			mount_component(link0, div0, null);
    			append_dev(div7, t0);
    			append_dev(div7, div1);
    			mount_component(link1, div1, null);
    			append_dev(div7, t1);
    			append_dev(div7, div2);
    			mount_component(link2, div2, null);
    			append_dev(div7, t2);
    			append_dev(div7, div3);
    			mount_component(link3, div3, null);
    			append_dev(div7, t3);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, i1);
    			append_dev(i1, span);
    			append_dev(span, br);
    			append_dev(span, i0);
    			append_dev(span, t4);
    			append_dev(div12, t5);
    			append_dev(div12, div11);
    			mount_component(link4, div11, null);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, div13, anchor);
    			mount_component(route0, div13, null);
    			append_dev(div13, t7);
    			mount_component(route1, div13, null);
    			append_dev(div13, t8);
    			mount_component(route2, div13, null);
    			append_dev(div13, t9);
    			mount_component(route3, div13, null);
    			append_dev(div13, t10);
    			mount_component(route4, div13, null);
    			append_dev(div13, t11);
    			mount_component(route5, div13, null);
    			append_dev(div13, t12);
    			mount_component(route6, div13, null);
    			append_dev(div13, t13);
    			mount_component(route7, div13, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const link0_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				link0_changes.$$scope = { dirty, ctx };
    			}

    			link0.$set(link0_changes);
    			const link1_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				link1_changes.$$scope = { dirty, ctx };
    			}

    			link1.$set(link1_changes);
    			const link2_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				link2_changes.$$scope = { dirty, ctx };
    			}

    			link2.$set(link2_changes);
    			const link3_changes = {};

    			if (dirty & /*$$scope*/ 64) {
    				link3_changes.$$scope = { dirty, ctx };
    			}

    			link3.$set(link3_changes);
    			const link4_changes = {};

    			if (dirty & /*$$scope, src*/ 68) {
    				link4_changes.$$scope = { dirty, ctx };
    			}

    			link4.$set(link4_changes);

    			if (dirty & /*y*/ 2) {
    				toggle_class(header, "nav-custome-bottom", /*y*/ ctx[1] <= 600);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(link0.$$.fragment, local);
    			transition_in(link1.$$.fragment, local);
    			transition_in(link2.$$.fragment, local);
    			transition_in(link3.$$.fragment, local);
    			transition_in(link4.$$.fragment, local);
    			transition_in(route0.$$.fragment, local);
    			transition_in(route1.$$.fragment, local);
    			transition_in(route2.$$.fragment, local);
    			transition_in(route3.$$.fragment, local);
    			transition_in(route4.$$.fragment, local);
    			transition_in(route5.$$.fragment, local);
    			transition_in(route6.$$.fragment, local);
    			transition_in(route7.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(link0.$$.fragment, local);
    			transition_out(link1.$$.fragment, local);
    			transition_out(link2.$$.fragment, local);
    			transition_out(link3.$$.fragment, local);
    			transition_out(link4.$$.fragment, local);
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			transition_out(route3.$$.fragment, local);
    			transition_out(route4.$$.fragment, local);
    			transition_out(route5.$$.fragment, local);
    			transition_out(route6.$$.fragment, local);
    			transition_out(route7.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			destroy_component(link0);
    			destroy_component(link1);
    			destroy_component(link2);
    			destroy_component(link3);
    			destroy_component(link4);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(div13);
    			destroy_component(route0);
    			destroy_component(route1);
    			destroy_component(route2);
    			destroy_component(route3);
    			destroy_component(route4);
    			destroy_component(route5);
    			destroy_component(route6);
    			destroy_component(route7);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(28:0) <Router url=\\\"{url}\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let router;
    	let t0;
    	let div5;
    	let div4;
    	let div3;
    	let div1;
    	let div0;
    	let t2;
    	let div2;
    	let button;
    	let current;

    	router = new Router({
    			props: {
    				url: /*url*/ ctx[0],
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(router.$$.fragment);
    			t0 = space();
    			div5 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "حاجی خالیه چیزی نیست";
    			t2 = space();
    			div2 = element("div");
    			button = element("button");
    			button.textContent = "بستن";
    			attr_dev(div0, "class", "nav flex-sm-column flex-row text-center");
    			add_location(div0, file$3, 109, 20, 5692);
    			attr_dev(div1, "class", "modal-body");
    			add_location(div1, file$3, 108, 16, 5647);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-secondary");
    			attr_dev(button, "data-dismiss", "modal");
    			add_location(button, file$3, 114, 20, 5904);
    			attr_dev(div2, "class", "modal-footer");
    			add_location(div2, file$3, 113, 16, 5857);
    			attr_dev(div3, "class", "modal-content");
    			add_location(div3, file$3, 107, 12, 5603);
    			attr_dev(div4, "class", "modal-dialog");
    			attr_dev(div4, "role", "document");
    			add_location(div4, file$3, 106, 8, 5548);
    			attr_dev(div5, "class", "nav-modal modal left fade");
    			attr_dev(div5, "id", "mod1");
    			attr_dev(div5, "tabindex", "");
    			attr_dev(div5, "role", "dialog");
    			attr_dev(div5, "aria-hidden", "true");
    			add_location(div5, file$3, 105, 4, 5445);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(router, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			append_dev(div1, div0);
    			append_dev(div3, t2);
    			append_dev(div3, div2);
    			append_dev(div2, button);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const router_changes = {};
    			if (dirty & /*url*/ 1) router_changes.url = /*url*/ ctx[0];

    			if (dirty & /*$$scope, y, src*/ 70) {
    				router_changes.$$scope = { dirty, ctx };
    			}

    			router.$set(router_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(router, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div5);
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

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Nav", slots, []);
    	let { url = "" } = $$props;
    	let { y } = $$props;
    	var currentLocation = window.location.href;
    	var splitUrl = currentLocation.split("/");
    	var lastSugment = splitUrl[splitUrl.length - 1];
    	let src;

    	if (lastSugment === "show-detail") {
    		src = "../image/1.png";
    	} else {
    		src = "image/1.png";
    	}

    	const writable_props = ["url", "y"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Nav> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("url" in $$props) $$invalidate(0, url = $$props.url);
    		if ("y" in $$props) $$invalidate(1, y = $$props.y);
    	};

    	$$self.$capture_state = () => ({
    		Router,
    		Link,
    		Route,
    		fade,
    		slide,
    		scale,
    		fly,
    		about: About,
    		contact: Contact,
    		magezine: Magezine,
    		profile: Profile,
    		showDetail: Show_detail,
    		home: Home,
    		url,
    		y,
    		currentLocation,
    		splitUrl,
    		lastSugment,
    		src
    	});

    	$$self.$inject_state = $$props => {
    		if ("url" in $$props) $$invalidate(0, url = $$props.url);
    		if ("y" in $$props) $$invalidate(1, y = $$props.y);
    		if ("currentLocation" in $$props) currentLocation = $$props.currentLocation;
    		if ("splitUrl" in $$props) splitUrl = $$props.splitUrl;
    		if ("lastSugment" in $$props) $$invalidate(5, lastSugment = $$props.lastSugment);
    		if ("src" in $$props) $$invalidate(2, src = $$props.src);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	console.log(lastSugment);
    	return [url, y, src];
    }

    class Nav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { url: 0, y: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Nav",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*y*/ ctx[1] === undefined && !("y" in props)) {
    			console_1.warn("<Nav> was created without expected prop 'y'");
    		}
    	}

    	get url() {
    		throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get y() {
    		throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/layout/Footer.svelte generated by Svelte v3.38.3 */

    const file$2 = "src/layout/Footer.svelte";

    function create_fragment$2(ctx) {
    	let scrolling = false;

    	let clear_scrolling = () => {
    		scrolling = false;
    	};

    	let scrolling_timeout;
    	let footer;
    	let div10;
    	let div0;
    	let h50;
    	let img;
    	let img_src_value;
    	let t0;
    	let span0;
    	let span1;
    	let t3;
    	let div9;
    	let div1;
    	let form;
    	let fieldset0;
    	let input;
    	let t4;
    	let fieldset1;
    	let textarea;
    	let t5;
    	let fieldset2;
    	let button;
    	let t7;
    	let div4;
    	let div2;
    	let h51;
    	let t9;
    	let hr;
    	let t10;
    	let div3;
    	let ul0;
    	let li0;
    	let a0;
    	let i0;
    	let t11;
    	let li1;
    	let a1;
    	let i1;
    	let t12;
    	let li2;
    	let a2;
    	let i2;
    	let t13;
    	let li3;
    	let a3;
    	let i3;
    	let t14;
    	let br;
    	let t15;
    	let div8;
    	let div7;
    	let div5;
    	let ul1;
    	let li4;
    	let a4;
    	let t17;
    	let li5;
    	let a5;
    	let t19;
    	let li6;
    	let a6;
    	let t21;
    	let li7;
    	let a7;
    	let t23;
    	let li8;
    	let a8;
    	let t25;
    	let li9;
    	let a9;
    	let t27;
    	let li10;
    	let a10;
    	let t29;
    	let li11;
    	let a11;
    	let t31;
    	let div6;
    	let ul2;
    	let li12;
    	let a12;
    	let t33;
    	let li13;
    	let a13;
    	let t35;
    	let li14;
    	let a14;
    	let t37;
    	let div11;
    	let p;
    	let t38;
    	let a15;
    	let t40;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowscroll*/ ctx[1]);

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			div10 = element("div");
    			div0 = element("div");
    			h50 = element("h5");
    			img = element("img");
    			t0 = space();
    			span0 = element("span");
    			span0.textContent = "اینو";
    			span1 = element("span");
    			span1.textContent = "لینکس";
    			t3 = space();
    			div9 = element("div");
    			div1 = element("div");
    			form = element("form");
    			fieldset0 = element("fieldset");
    			input = element("input");
    			t4 = space();
    			fieldset1 = element("fieldset");
    			textarea = element("textarea");
    			t5 = space();
    			fieldset2 = element("fieldset");
    			button = element("button");
    			button.textContent = "ارسال";
    			t7 = space();
    			div4 = element("div");
    			div2 = element("div");
    			h51 = element("h5");
    			h51.textContent = "ما را در شبکه های اجتماعی دنبال کنید";
    			t9 = space();
    			hr = element("hr");
    			t10 = space();
    			div3 = element("div");
    			ul0 = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			i0 = element("i");
    			t11 = space();
    			li1 = element("li");
    			a1 = element("a");
    			i1 = element("i");
    			t12 = space();
    			li2 = element("li");
    			a2 = element("a");
    			i2 = element("i");
    			t13 = space();
    			li3 = element("li");
    			a3 = element("a");
    			i3 = element("i");
    			t14 = space();
    			br = element("br");
    			t15 = space();
    			div8 = element("div");
    			div7 = element("div");
    			div5 = element("div");
    			ul1 = element("ul");
    			li4 = element("li");
    			a4 = element("a");
    			a4.textContent = "مدیریت بخش اصلی سایت";
    			t17 = space();
    			li5 = element("li");
    			a5 = element("a");
    			a5.textContent = "برنامه ریزی";
    			t19 = space();
    			li6 = element("li");
    			a6 = element("a");
    			a6.textContent = "اسناد طبقه بندی شده";
    			t21 = space();
    			li7 = element("li");
    			a7 = element("a");
    			a7.textContent = "سرویس دو پارچه آگرین";
    			t23 = space();
    			li8 = element("li");
    			a8 = element("a");
    			a8.textContent = "داده های ثبت احوال";
    			t25 = space();
    			li9 = element("li");
    			a9 = element("a");
    			a9.textContent = "پشتیبانی سایت";
    			t27 = space();
    			li10 = element("li");
    			a10 = element("a");
    			a10.textContent = "اعضای تیم مرکزی";
    			t29 = space();
    			li11 = element("li");
    			a11 = element("a");
    			a11.textContent = "طرح سوال از مخاطب";
    			t31 = space();
    			div6 = element("div");
    			ul2 = element("ul");
    			li12 = element("li");
    			a12 = element("a");
    			a12.textContent = "اعضای تیم مرکزی";
    			t33 = space();
    			li13 = element("li");
    			a13 = element("a");
    			a13.textContent = "طرح سوال از مخاطب";
    			t35 = space();
    			li14 = element("li");
    			a14 = element("a");
    			a14.textContent = "اعضای تیم مرکزی";
    			t37 = space();
    			div11 = element("div");
    			p = element("p");
    			t38 = text("© تمام حقوق برای ");
    			a15 = element("a");
    			a15.textContent = "inolinX.com";
    			t40 = text(" محفوظ است.");
    			if (img.src !== (img_src_value = "image/1.png")) attr_dev(img, "src", img_src_value);
    			add_location(img, file$2, 12, 16, 227);
    			add_location(span0, file$2, 13, 16, 267);
    			add_location(span1, file$2, 13, 33, 284);
    			add_location(h50, file$2, 12, 12, 223);
    			attr_dev(div0, "class", "icon_footer");
    			add_location(div0, file$2, 11, 8, 185);
    			attr_dev(input, "type", "email");
    			attr_dev(input, "class", "form-control");
    			attr_dev(input, "id", "exampleInputEmail1");
    			attr_dev(input, "placeholder", "لطفا ایمیل خود را وارد کنید");
    			add_location(input, file$2, 21, 24, 527);
    			attr_dev(fieldset0, "class", "form-group");
    			add_location(fieldset0, file$2, 20, 20, 473);
    			attr_dev(textarea, "class", "form-control");
    			attr_dev(textarea, "id", "exampleMessage");
    			attr_dev(textarea, "placeholder", "متن");
    			add_location(textarea, file$2, 24, 24, 741);
    			attr_dev(fieldset1, "class", "form-group");
    			add_location(fieldset1, file$2, 23, 20, 687);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn");
    			add_location(button, file$2, 27, 24, 942);
    			attr_dev(fieldset2, "class", "form-group text-xs-right");
    			add_location(fieldset2, file$2, 26, 20, 874);
    			set_style(form, "direction", "rtl");
    			add_location(form, file$2, 19, 16, 422);
    			attr_dev(div1, "class", "col-md-4");
    			add_location(div1, file$2, 18, 12, 383);
    			attr_dev(h51, "class", "text-center mx-auto");
    			add_location(h51, file$2, 33, 20, 1211);
    			attr_dev(div2, "class", "col-12");
    			add_location(div2, file$2, 32, 16, 1170);
    			add_location(hr, file$2, 35, 16, 1324);
    			attr_dev(i0, "class", "fab fa-github fa-lg");
    			add_location(i0, file$2, 38, 73, 1500);
    			attr_dev(a0, "href", "");
    			attr_dev(a0, "class", "nav-link");
    			add_location(a0, file$2, 38, 45, 1472);
    			attr_dev(li0, "class", "nav-item");
    			add_location(li0, file$2, 38, 24, 1451);
    			attr_dev(i1, "class", "fab fa-twitter fa-lg");
    			add_location(i1, file$2, 39, 73, 1618);
    			attr_dev(a1, "href", "");
    			attr_dev(a1, "class", "nav-link");
    			add_location(a1, file$2, 39, 45, 1590);
    			attr_dev(li1, "class", "nav-item");
    			add_location(li1, file$2, 39, 24, 1569);
    			attr_dev(i2, "class", "fas fa-check-circle fa-lg");
    			add_location(i2, file$2, 40, 73, 1737);
    			attr_dev(a2, "href", "");
    			attr_dev(a2, "class", "nav-link");
    			add_location(a2, file$2, 40, 45, 1709);
    			attr_dev(li2, "class", "nav-item");
    			add_location(li2, file$2, 40, 24, 1688);
    			attr_dev(i3, "class", "fab fa-instagram fa-lg");
    			add_location(i3, file$2, 41, 73, 1861);
    			attr_dev(a3, "href", "");
    			attr_dev(a3, "class", "nav-link");
    			add_location(a3, file$2, 41, 45, 1833);
    			attr_dev(li3, "class", "nav-item");
    			add_location(li3, file$2, 41, 24, 1812);
    			attr_dev(ul0, "class", "nav justify-content-center");
    			add_location(ul0, file$2, 37, 20, 1386);
    			add_location(br, file$2, 43, 20, 1955);
    			attr_dev(div3, "class", "col-12");
    			add_location(div3, file$2, 36, 16, 1345);
    			attr_dev(div4, "class", "col-md-4 order-md-first social_media");
    			set_style(div4, "direction", "rtl");
    			add_location(div4, file$2, 31, 12, 1079);
    			attr_dev(a4, "href", "");
    			add_location(a4, file$2, 50, 32, 2244);
    			add_location(li4, file$2, 50, 28, 2240);
    			attr_dev(a5, "href", "");
    			add_location(a5, file$2, 51, 32, 2317);
    			add_location(li5, file$2, 51, 28, 2313);
    			attr_dev(a6, "href", "");
    			add_location(a6, file$2, 52, 32, 2382);
    			add_location(li6, file$2, 52, 28, 2378);
    			attr_dev(a7, "href", "");
    			add_location(a7, file$2, 53, 32, 2454);
    			add_location(li7, file$2, 53, 28, 2450);
    			attr_dev(a8, "href", "");
    			add_location(a8, file$2, 54, 32, 2527);
    			add_location(li8, file$2, 54, 28, 2523);
    			attr_dev(a9, "href", "");
    			add_location(a9, file$2, 55, 32, 2598);
    			add_location(li9, file$2, 55, 28, 2594);
    			attr_dev(a10, "href", "");
    			add_location(a10, file$2, 56, 32, 2664);
    			add_location(li10, file$2, 56, 28, 2660);
    			attr_dev(a11, "href", "");
    			add_location(a11, file$2, 57, 32, 2732);
    			add_location(li11, file$2, 57, 28, 2728);
    			attr_dev(ul1, "class", "list-unstyled");
    			add_location(ul1, file$2, 49, 24, 2185);
    			attr_dev(div5, "class", "col-6");
    			add_location(div5, file$2, 48, 20, 2141);
    			attr_dev(a12, "href", "");
    			add_location(a12, file$2, 62, 32, 2950);
    			add_location(li12, file$2, 62, 28, 2946);
    			attr_dev(a13, "href", "");
    			add_location(a13, file$2, 63, 32, 3018);
    			add_location(li13, file$2, 63, 28, 3014);
    			attr_dev(a14, "href", "");
    			add_location(a14, file$2, 64, 32, 3088);
    			add_location(li14, file$2, 64, 28, 3084);
    			attr_dev(ul2, "class", "list-unstyled");
    			add_location(ul2, file$2, 61, 24, 2891);
    			attr_dev(div6, "class", "col-6");
    			add_location(div6, file$2, 60, 20, 2847);
    			attr_dev(div7, "class", "row");
    			add_location(div7, file$2, 47, 16, 2103);
    			attr_dev(div8, "class", "col-md-4 order-first order-md-last");
    			set_style(div8, "direction", "rtl");
    			add_location(div8, file$2, 46, 12, 2014);
    			attr_dev(div9, "class", "row");
    			add_location(div9, file$2, 16, 8, 340);
    			attr_dev(div10, "class", "container");
    			add_location(div10, file$2, 10, 4, 153);
    			attr_dev(a15, "target", "blank");
    			attr_dev(a15, "href", "http://www.inolinx.com");
    			add_location(a15, file$2, 73, 28, 3316);
    			add_location(p, file$2, 73, 8, 3296);
    			attr_dev(div11, "class", "copyright container");
    			add_location(div11, file$2, 72, 4, 3254);
    			attr_dev(footer, "class", "footer");
    			add_location(footer, file$2, 9, 0, 125);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			append_dev(footer, div10);
    			append_dev(div10, div0);
    			append_dev(div0, h50);
    			append_dev(h50, img);
    			append_dev(h50, t0);
    			append_dev(h50, span0);
    			append_dev(h50, span1);
    			append_dev(div10, t3);
    			append_dev(div10, div9);
    			append_dev(div9, div1);
    			append_dev(div1, form);
    			append_dev(form, fieldset0);
    			append_dev(fieldset0, input);
    			append_dev(form, t4);
    			append_dev(form, fieldset1);
    			append_dev(fieldset1, textarea);
    			append_dev(form, t5);
    			append_dev(form, fieldset2);
    			append_dev(fieldset2, button);
    			append_dev(div9, t7);
    			append_dev(div9, div4);
    			append_dev(div4, div2);
    			append_dev(div2, h51);
    			append_dev(div4, t9);
    			append_dev(div4, hr);
    			append_dev(div4, t10);
    			append_dev(div4, div3);
    			append_dev(div3, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a0);
    			append_dev(a0, i0);
    			append_dev(ul0, t11);
    			append_dev(ul0, li1);
    			append_dev(li1, a1);
    			append_dev(a1, i1);
    			append_dev(ul0, t12);
    			append_dev(ul0, li2);
    			append_dev(li2, a2);
    			append_dev(a2, i2);
    			append_dev(ul0, t13);
    			append_dev(ul0, li3);
    			append_dev(li3, a3);
    			append_dev(a3, i3);
    			append_dev(div3, t14);
    			append_dev(div3, br);
    			append_dev(div9, t15);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div5);
    			append_dev(div5, ul1);
    			append_dev(ul1, li4);
    			append_dev(li4, a4);
    			append_dev(ul1, t17);
    			append_dev(ul1, li5);
    			append_dev(li5, a5);
    			append_dev(ul1, t19);
    			append_dev(ul1, li6);
    			append_dev(li6, a6);
    			append_dev(ul1, t21);
    			append_dev(ul1, li7);
    			append_dev(li7, a7);
    			append_dev(ul1, t23);
    			append_dev(ul1, li8);
    			append_dev(li8, a8);
    			append_dev(ul1, t25);
    			append_dev(ul1, li9);
    			append_dev(li9, a9);
    			append_dev(ul1, t27);
    			append_dev(ul1, li10);
    			append_dev(li10, a10);
    			append_dev(ul1, t29);
    			append_dev(ul1, li11);
    			append_dev(li11, a11);
    			append_dev(div7, t31);
    			append_dev(div7, div6);
    			append_dev(div6, ul2);
    			append_dev(ul2, li12);
    			append_dev(li12, a12);
    			append_dev(ul2, t33);
    			append_dev(ul2, li13);
    			append_dev(li13, a13);
    			append_dev(ul2, t35);
    			append_dev(ul2, li14);
    			append_dev(li14, a14);
    			append_dev(footer, t37);
    			append_dev(footer, div11);
    			append_dev(div11, p);
    			append_dev(p, t38);
    			append_dev(p, a15);
    			append_dev(p, t40);

    			if (!mounted) {
    				dispose = listen_dev(window, "scroll", () => {
    					scrolling = true;
    					clearTimeout(scrolling_timeout);
    					scrolling_timeout = setTimeout(clear_scrolling, 100);
    					/*onwindowscroll*/ ctx[1]();
    				});

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*y*/ 1 && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window.pageXOffset, /*y*/ ctx[0]);
    				scrolling_timeout = setTimeout(clear_scrolling, 100);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(footer);
    			mounted = false;
    			dispose();
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

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Footer", slots, []);
    	let { y } = $$props;
    	const writable_props = ["y"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	function onwindowscroll() {
    		$$invalidate(0, y = window.pageYOffset);
    	}

    	$$self.$$set = $$props => {
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    	};

    	$$self.$capture_state = () => ({ y });

    	$$self.$inject_state = $$props => {
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [y, onwindowscroll];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { y: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*y*/ ctx[0] === undefined && !("y" in props)) {
    			console.warn("<Footer> was created without expected prop 'y'");
    		}
    	}

    	get y() {
    		throw new Error("<Footer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<Footer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const durationUnitRegex = /[a-zA-Z]/;
    const range = (size, startAt = 0) => [...Array(size).keys()].map(i => i + startAt);
    // export const characterRange = (startChar, endChar) =>
    //   String.fromCharCode(
    //     ...range(
    //       endChar.charCodeAt(0) - startChar.charCodeAt(0),
    //       startChar.charCodeAt(0)
    //     )
    //   );
    // export const zip = (arr, ...arrs) =>
    //   arr.map((val, i) => arrs.reduce((list, curr) => [...list, curr[i]], [val]));

    /* node_modules/svelte-loading-spinners/dist/Wave.svelte generated by Svelte v3.38.3 */
    const file$1 = "node_modules/svelte-loading-spinners/dist/Wave.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (48:2) {#each range(10, 0) as version}
    function create_each_block(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "bar svelte-8cmcz4");
    			set_style(div, "left", /*version*/ ctx[6] * (+/*size*/ ctx[3] / 5 + (+/*size*/ ctx[3] / 15 - +/*size*/ ctx[3] / 100)) + /*unit*/ ctx[1]);
    			set_style(div, "animation-delay", /*version*/ ctx[6] * (+/*durationNum*/ ctx[5] / 8.3) + /*durationUnit*/ ctx[4]);
    			add_location(div, file$1, 48, 4, 1193);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*size, unit*/ 10) {
    				set_style(div, "left", /*version*/ ctx[6] * (+/*size*/ ctx[3] / 5 + (+/*size*/ ctx[3] / 15 - +/*size*/ ctx[3] / 100)) + /*unit*/ ctx[1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(48:2) {#each range(10, 0) as version}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let each_value = range(10, 0);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "wrapper svelte-8cmcz4");
    			set_style(div, "--size", /*size*/ ctx[3] + /*unit*/ ctx[1]);
    			set_style(div, "--color", /*color*/ ctx[0]);
    			set_style(div, "--duration", /*duration*/ ctx[2]);
    			add_location(div, file$1, 44, 0, 1053);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*range, size, unit, durationNum, durationUnit*/ 58) {
    				each_value = range(10, 0);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*size, unit*/ 10) {
    				set_style(div, "--size", /*size*/ ctx[3] + /*unit*/ ctx[1]);
    			}

    			if (dirty & /*color*/ 1) {
    				set_style(div, "--color", /*color*/ ctx[0]);
    			}

    			if (dirty & /*duration*/ 4) {
    				set_style(div, "--duration", /*duration*/ ctx[2]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
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

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Wave", slots, []);
    	
    	let { color = "#FF3E00" } = $$props;
    	let { unit = "px" } = $$props;
    	let { duration = "1.25s" } = $$props;
    	let { size = "60" } = $$props;
    	let durationUnit = duration.match(durationUnitRegex)[0];
    	let durationNum = duration.replace(durationUnitRegex, "");
    	const writable_props = ["color", "unit", "duration", "size"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Wave> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("color" in $$props) $$invalidate(0, color = $$props.color);
    		if ("unit" in $$props) $$invalidate(1, unit = $$props.unit);
    		if ("duration" in $$props) $$invalidate(2, duration = $$props.duration);
    		if ("size" in $$props) $$invalidate(3, size = $$props.size);
    	};

    	$$self.$capture_state = () => ({
    		range,
    		durationUnitRegex,
    		color,
    		unit,
    		duration,
    		size,
    		durationUnit,
    		durationNum
    	});

    	$$self.$inject_state = $$props => {
    		if ("color" in $$props) $$invalidate(0, color = $$props.color);
    		if ("unit" in $$props) $$invalidate(1, unit = $$props.unit);
    		if ("duration" in $$props) $$invalidate(2, duration = $$props.duration);
    		if ("size" in $$props) $$invalidate(3, size = $$props.size);
    		if ("durationUnit" in $$props) $$invalidate(4, durationUnit = $$props.durationUnit);
    		if ("durationNum" in $$props) $$invalidate(5, durationNum = $$props.durationNum);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [color, unit, duration, size, durationUnit, durationNum];
    }

    class Wave extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { color: 0, unit: 1, duration: 2, size: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Wave",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get color() {
    		throw new Error("<Wave>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Wave>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get unit() {
    		throw new Error("<Wave>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set unit(value) {
    		throw new Error("<Wave>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get duration() {
    		throw new Error("<Wave>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set duration(value) {
    		throw new Error("<Wave>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get size() {
    		throw new Error("<Wave>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set size(value) {
    		throw new Error("<Wave>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.38.3 */

    const { setTimeout: setTimeout_1 } = globals;
    const file = "src/App.svelte";

    // (27:0) {#if loading===true}
    function create_if_block_1(ctx) {
    	let div;
    	let wave;
    	let span;
    	let current;

    	wave = new Wave({
    			props: {
    				size: "100",
    				color: "green",
    				unit: "px",
    				duration: "1s"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(wave.$$.fragment);
    			span = element("span");
    			span.textContent = "لطفا کمی صبر کنید...";
    			attr_dev(span, "class", "loading-snipper");
    			add_location(span, file, 28, 66, 662);
    			set_style(div, "direction", "rtl");
    			set_style(div, "text-align", "center");
    			set_style(div, "margin", "auto");
    			set_style(div, "width", "100%");
    			set_style(div, "height", "100%");
    			add_location(div, file, 27, 1, 510);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(wave, div, null);
    			append_dev(div, span);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(wave.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(wave.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(wave);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(27:0) {#if loading===true}",
    		ctx
    	});

    	return block;
    }

    // (35:0) {#if loading===false}
    function create_if_block(ctx) {
    	let div;
    	let nav;
    	let t0;
    	let footer;
    	let t1;
    	let script;
    	let script_src_value;
    	let current;

    	nav = new Nav({
    			props: { y: /*y*/ ctx[0] },
    			$$inline: true
    		});

    	footer = new Footer({
    			props: { y: /*y*/ ctx[0] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(nav.$$.fragment);
    			t0 = space();
    			create_component(footer.$$.fragment);
    			t1 = space();
    			script = element("script");
    			attr_dev(div, "class", "class ");
    			add_location(div, file, 35, 0, 812);
    			if (script.src !== (script_src_value = "/script.js")) attr_dev(script, "src", script_src_value);
    			add_location(script, file, 39, 1, 868);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(nav, div, null);
    			append_dev(div, t0);
    			mount_component(footer, div, null);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, script, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const nav_changes = {};
    			if (dirty & /*y*/ 1) nav_changes.y = /*y*/ ctx[0];
    			nav.$set(nav_changes);
    			const footer_changes = {};
    			if (dirty & /*y*/ 1) footer_changes.y = /*y*/ ctx[0];
    			footer.$set(footer_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(nav);
    			destroy_component(footer);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(script);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(35:0) {#if loading===false}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let scrolling = false;

    	let clear_scrolling = () => {
    		scrolling = false;
    	};

    	let scrolling_timeout;
    	let t;
    	let if_block1_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowscroll*/ ctx[3]);
    	add_render_callback(/*onwindowresize*/ ctx[4]);
    	let if_block0 = /*loading*/ ctx[2] === true && create_if_block_1(ctx);
    	let if_block1 = /*loading*/ ctx[2] === false && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "scroll", () => {
    						scrolling = true;
    						clearTimeout(scrolling_timeout);
    						scrolling_timeout = setTimeout_1(clear_scrolling, 100);
    						/*onwindowscroll*/ ctx[3]();
    					}),
    					listen_dev(window, "resize", /*onwindowresize*/ ctx[4])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*y*/ 1 && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window.pageXOffset, /*y*/ ctx[0]);
    				scrolling_timeout = setTimeout_1(clear_scrolling, 100);
    			}

    			if (/*loading*/ ctx[2] === true) {
    				if (if_block0) {
    					if (dirty & /*loading*/ 4) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t.parentNode, t);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*loading*/ ctx[2] === false) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*loading*/ 4) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    			mounted = false;
    			run_all(dispose);
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

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let y = 0;
    	let x = 0;

    	//$: console.log(y);	
    	///
    	let loading = false;

    	setTimeout(
    		function () {
    			$$invalidate(2, loading = false);
    		},
    		2000
    	);

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function onwindowscroll() {
    		$$invalidate(0, y = window.pageYOffset);
    	}

    	function onwindowresize() {
    		$$invalidate(1, x = window.innerWidth);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		Nav,
    		Footer,
    		fade,
    		slide,
    		scale,
    		fly,
    		Wave,
    		y,
    		x,
    		loading
    	});

    	$$self.$inject_state = $$props => {
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    		if ("x" in $$props) $$invalidate(1, x = $$props.x);
    		if ("loading" in $$props) $$invalidate(2, loading = $$props.loading);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [y, x, loading, onwindowscroll, onwindowresize];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
