
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

    function create_fragment$e(ctx) {
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
    		id: create_fragment$e.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$e($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, { basepath: 3, url: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$e.name
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
    function create_if_block$5(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1$3, create_else_block];
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
    		id: create_if_block$5.name,
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
    function create_if_block_1$3(ctx) {
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
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(41:2) {#if component !== null}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$d(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$activeRoute*/ ctx[1] !== null && /*$activeRoute*/ ctx[1].route === /*route*/ ctx[7] && create_if_block$5(ctx);

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
    					if_block = create_if_block$5(ctx);
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
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, { path: 8, component: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Route",
    			options,
    			id: create_fragment$d.name
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
    const file$b = "node_modules/svelte-routing/src/Link.svelte";

    function create_fragment$c(ctx) {
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
    			add_location(a, file$b, 40, 0, 1249);
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
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
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

    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {
    			to: 7,
    			replace: 8,
    			state: 9,
    			getProps: 10
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Link",
    			options,
    			id: create_fragment$c.name
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
    const file$a = "src/pages/about.svelte";

    function create_fragment$b(ctx) {
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
    			add_location(div, file$a, 13, 0, 336);
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
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src/pages/contact.svelte generated by Svelte v3.38.3 */

    function create_fragment$a(ctx) {
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
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props) {
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
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Contact",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    /*!
     * jQuery JavaScript Library v3.6.0
     * https://jquery.com/
     *
     * Includes Sizzle.js
     * https://sizzlejs.com/
     *
     * Copyright OpenJS Foundation and other contributors
     * Released under the MIT license
     * https://jquery.org/license
     *
     * Date: 2021-03-02T17:08Z
     */

    var jquery = createCommonjsModule(function (module) {
    ( function( global, factory ) {

    	{

    		// For CommonJS and CommonJS-like environments where a proper `window`
    		// is present, execute the factory and get jQuery.
    		// For environments that do not have a `window` with a `document`
    		// (such as Node.js), expose a factory as module.exports.
    		// This accentuates the need for the creation of a real `window`.
    		// e.g. var jQuery = require("jquery")(window);
    		// See ticket #14549 for more info.
    		module.exports = global.document ?
    			factory( global, true ) :
    			function( w ) {
    				if ( !w.document ) {
    					throw new Error( "jQuery requires a window with a document" );
    				}
    				return factory( w );
    			};
    	}

    // Pass this if window is not defined yet
    } )( typeof window !== "undefined" ? window : commonjsGlobal, function( window, noGlobal ) {

    var arr = [];

    var getProto = Object.getPrototypeOf;

    var slice = arr.slice;

    var flat = function( array ) {
    	return arr.concat.apply( [], array );
    };


    var push = arr.push;

    var indexOf = arr.indexOf;

    var class2type = {};

    var toString = class2type.toString;

    var hasOwn = class2type.hasOwnProperty;

    var fnToString = hasOwn.toString;

    var ObjectFunctionString = fnToString.call( Object );

    var support = {};

    var isFunction = function isFunction( obj ) {

    		// Support: Chrome <=57, Firefox <=52
    		// In some browsers, typeof returns "function" for HTML <object> elements
    		// (i.e., `typeof document.createElement( "object" ) === "function"`).
    		// We don't want to classify *any* DOM node as a function.
    		// Support: QtWeb <=3.8.5, WebKit <=534.34, wkhtmltopdf tool <=0.12.5
    		// Plus for old WebKit, typeof returns "function" for HTML collections
    		// (e.g., `typeof document.getElementsByTagName("div") === "function"`). (gh-4756)
    		return typeof obj === "function" && typeof obj.nodeType !== "number" &&
    			typeof obj.item !== "function";
    	};


    var isWindow = function isWindow( obj ) {
    		return obj != null && obj === obj.window;
    	};


    var document = window.document;



    	var preservedScriptAttributes = {
    		type: true,
    		src: true,
    		nonce: true,
    		noModule: true
    	};

    	function DOMEval( code, node, doc ) {
    		doc = doc || document;

    		var i, val,
    			script = doc.createElement( "script" );

    		script.text = code;
    		if ( node ) {
    			for ( i in preservedScriptAttributes ) {

    				// Support: Firefox 64+, Edge 18+
    				// Some browsers don't support the "nonce" property on scripts.
    				// On the other hand, just using `getAttribute` is not enough as
    				// the `nonce` attribute is reset to an empty string whenever it
    				// becomes browsing-context connected.
    				// See https://github.com/whatwg/html/issues/2369
    				// See https://html.spec.whatwg.org/#nonce-attributes
    				// The `node.getAttribute` check was added for the sake of
    				// `jQuery.globalEval` so that it can fake a nonce-containing node
    				// via an object.
    				val = node[ i ] || node.getAttribute && node.getAttribute( i );
    				if ( val ) {
    					script.setAttribute( i, val );
    				}
    			}
    		}
    		doc.head.appendChild( script ).parentNode.removeChild( script );
    	}


    function toType( obj ) {
    	if ( obj == null ) {
    		return obj + "";
    	}

    	// Support: Android <=2.3 only (functionish RegExp)
    	return typeof obj === "object" || typeof obj === "function" ?
    		class2type[ toString.call( obj ) ] || "object" :
    		typeof obj;
    }
    /* global Symbol */
    // Defining this global in .eslintrc.json would create a danger of using the global
    // unguarded in another place, it seems safer to define global only for this module



    var
    	version = "3.6.0",

    	// Define a local copy of jQuery
    	jQuery = function( selector, context ) {

    		// The jQuery object is actually just the init constructor 'enhanced'
    		// Need init if jQuery is called (just allow error to be thrown if not included)
    		return new jQuery.fn.init( selector, context );
    	};

    jQuery.fn = jQuery.prototype = {

    	// The current version of jQuery being used
    	jquery: version,

    	constructor: jQuery,

    	// The default length of a jQuery object is 0
    	length: 0,

    	toArray: function() {
    		return slice.call( this );
    	},

    	// Get the Nth element in the matched element set OR
    	// Get the whole matched element set as a clean array
    	get: function( num ) {

    		// Return all the elements in a clean array
    		if ( num == null ) {
    			return slice.call( this );
    		}

    		// Return just the one element from the set
    		return num < 0 ? this[ num + this.length ] : this[ num ];
    	},

    	// Take an array of elements and push it onto the stack
    	// (returning the new matched element set)
    	pushStack: function( elems ) {

    		// Build a new jQuery matched element set
    		var ret = jQuery.merge( this.constructor(), elems );

    		// Add the old object onto the stack (as a reference)
    		ret.prevObject = this;

    		// Return the newly-formed element set
    		return ret;
    	},

    	// Execute a callback for every element in the matched set.
    	each: function( callback ) {
    		return jQuery.each( this, callback );
    	},

    	map: function( callback ) {
    		return this.pushStack( jQuery.map( this, function( elem, i ) {
    			return callback.call( elem, i, elem );
    		} ) );
    	},

    	slice: function() {
    		return this.pushStack( slice.apply( this, arguments ) );
    	},

    	first: function() {
    		return this.eq( 0 );
    	},

    	last: function() {
    		return this.eq( -1 );
    	},

    	even: function() {
    		return this.pushStack( jQuery.grep( this, function( _elem, i ) {
    			return ( i + 1 ) % 2;
    		} ) );
    	},

    	odd: function() {
    		return this.pushStack( jQuery.grep( this, function( _elem, i ) {
    			return i % 2;
    		} ) );
    	},

    	eq: function( i ) {
    		var len = this.length,
    			j = +i + ( i < 0 ? len : 0 );
    		return this.pushStack( j >= 0 && j < len ? [ this[ j ] ] : [] );
    	},

    	end: function() {
    		return this.prevObject || this.constructor();
    	},

    	// For internal use only.
    	// Behaves like an Array's method, not like a jQuery method.
    	push: push,
    	sort: arr.sort,
    	splice: arr.splice
    };

    jQuery.extend = jQuery.fn.extend = function() {
    	var options, name, src, copy, copyIsArray, clone,
    		target = arguments[ 0 ] || {},
    		i = 1,
    		length = arguments.length,
    		deep = false;

    	// Handle a deep copy situation
    	if ( typeof target === "boolean" ) {
    		deep = target;

    		// Skip the boolean and the target
    		target = arguments[ i ] || {};
    		i++;
    	}

    	// Handle case when target is a string or something (possible in deep copy)
    	if ( typeof target !== "object" && !isFunction( target ) ) {
    		target = {};
    	}

    	// Extend jQuery itself if only one argument is passed
    	if ( i === length ) {
    		target = this;
    		i--;
    	}

    	for ( ; i < length; i++ ) {

    		// Only deal with non-null/undefined values
    		if ( ( options = arguments[ i ] ) != null ) {

    			// Extend the base object
    			for ( name in options ) {
    				copy = options[ name ];

    				// Prevent Object.prototype pollution
    				// Prevent never-ending loop
    				if ( name === "__proto__" || target === copy ) {
    					continue;
    				}

    				// Recurse if we're merging plain objects or arrays
    				if ( deep && copy && ( jQuery.isPlainObject( copy ) ||
    					( copyIsArray = Array.isArray( copy ) ) ) ) {
    					src = target[ name ];

    					// Ensure proper type for the source value
    					if ( copyIsArray && !Array.isArray( src ) ) {
    						clone = [];
    					} else if ( !copyIsArray && !jQuery.isPlainObject( src ) ) {
    						clone = {};
    					} else {
    						clone = src;
    					}
    					copyIsArray = false;

    					// Never move original objects, clone them
    					target[ name ] = jQuery.extend( deep, clone, copy );

    				// Don't bring in undefined values
    				} else if ( copy !== undefined ) {
    					target[ name ] = copy;
    				}
    			}
    		}
    	}

    	// Return the modified object
    	return target;
    };

    jQuery.extend( {

    	// Unique for each copy of jQuery on the page
    	expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

    	// Assume jQuery is ready without the ready module
    	isReady: true,

    	error: function( msg ) {
    		throw new Error( msg );
    	},

    	noop: function() {},

    	isPlainObject: function( obj ) {
    		var proto, Ctor;

    		// Detect obvious negatives
    		// Use toString instead of jQuery.type to catch host objects
    		if ( !obj || toString.call( obj ) !== "[object Object]" ) {
    			return false;
    		}

    		proto = getProto( obj );

    		// Objects with no prototype (e.g., `Object.create( null )`) are plain
    		if ( !proto ) {
    			return true;
    		}

    		// Objects with prototype are plain iff they were constructed by a global Object function
    		Ctor = hasOwn.call( proto, "constructor" ) && proto.constructor;
    		return typeof Ctor === "function" && fnToString.call( Ctor ) === ObjectFunctionString;
    	},

    	isEmptyObject: function( obj ) {
    		var name;

    		for ( name in obj ) {
    			return false;
    		}
    		return true;
    	},

    	// Evaluates a script in a provided context; falls back to the global one
    	// if not specified.
    	globalEval: function( code, options, doc ) {
    		DOMEval( code, { nonce: options && options.nonce }, doc );
    	},

    	each: function( obj, callback ) {
    		var length, i = 0;

    		if ( isArrayLike( obj ) ) {
    			length = obj.length;
    			for ( ; i < length; i++ ) {
    				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
    					break;
    				}
    			}
    		} else {
    			for ( i in obj ) {
    				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
    					break;
    				}
    			}
    		}

    		return obj;
    	},

    	// results is for internal usage only
    	makeArray: function( arr, results ) {
    		var ret = results || [];

    		if ( arr != null ) {
    			if ( isArrayLike( Object( arr ) ) ) {
    				jQuery.merge( ret,
    					typeof arr === "string" ?
    						[ arr ] : arr
    				);
    			} else {
    				push.call( ret, arr );
    			}
    		}

    		return ret;
    	},

    	inArray: function( elem, arr, i ) {
    		return arr == null ? -1 : indexOf.call( arr, elem, i );
    	},

    	// Support: Android <=4.0 only, PhantomJS 1 only
    	// push.apply(_, arraylike) throws on ancient WebKit
    	merge: function( first, second ) {
    		var len = +second.length,
    			j = 0,
    			i = first.length;

    		for ( ; j < len; j++ ) {
    			first[ i++ ] = second[ j ];
    		}

    		first.length = i;

    		return first;
    	},

    	grep: function( elems, callback, invert ) {
    		var callbackInverse,
    			matches = [],
    			i = 0,
    			length = elems.length,
    			callbackExpect = !invert;

    		// Go through the array, only saving the items
    		// that pass the validator function
    		for ( ; i < length; i++ ) {
    			callbackInverse = !callback( elems[ i ], i );
    			if ( callbackInverse !== callbackExpect ) {
    				matches.push( elems[ i ] );
    			}
    		}

    		return matches;
    	},

    	// arg is for internal usage only
    	map: function( elems, callback, arg ) {
    		var length, value,
    			i = 0,
    			ret = [];

    		// Go through the array, translating each of the items to their new values
    		if ( isArrayLike( elems ) ) {
    			length = elems.length;
    			for ( ; i < length; i++ ) {
    				value = callback( elems[ i ], i, arg );

    				if ( value != null ) {
    					ret.push( value );
    				}
    			}

    		// Go through every key on the object,
    		} else {
    			for ( i in elems ) {
    				value = callback( elems[ i ], i, arg );

    				if ( value != null ) {
    					ret.push( value );
    				}
    			}
    		}

    		// Flatten any nested arrays
    		return flat( ret );
    	},

    	// A global GUID counter for objects
    	guid: 1,

    	// jQuery.support is not used in Core but other projects attach their
    	// properties to it so it needs to exist.
    	support: support
    } );

    if ( typeof Symbol === "function" ) {
    	jQuery.fn[ Symbol.iterator ] = arr[ Symbol.iterator ];
    }

    // Populate the class2type map
    jQuery.each( "Boolean Number String Function Array Date RegExp Object Error Symbol".split( " " ),
    	function( _i, name ) {
    		class2type[ "[object " + name + "]" ] = name.toLowerCase();
    	} );

    function isArrayLike( obj ) {

    	// Support: real iOS 8.2 only (not reproducible in simulator)
    	// `in` check used to prevent JIT error (gh-2145)
    	// hasOwn isn't used here due to false negatives
    	// regarding Nodelist length in IE
    	var length = !!obj && "length" in obj && obj.length,
    		type = toType( obj );

    	if ( isFunction( obj ) || isWindow( obj ) ) {
    		return false;
    	}

    	return type === "array" || length === 0 ||
    		typeof length === "number" && length > 0 && ( length - 1 ) in obj;
    }
    var Sizzle =
    /*!
     * Sizzle CSS Selector Engine v2.3.6
     * https://sizzlejs.com/
     *
     * Copyright JS Foundation and other contributors
     * Released under the MIT license
     * https://js.foundation/
     *
     * Date: 2021-02-16
     */
    ( function( window ) {
    var i,
    	support,
    	Expr,
    	getText,
    	isXML,
    	tokenize,
    	compile,
    	select,
    	outermostContext,
    	sortInput,
    	hasDuplicate,

    	// Local document vars
    	setDocument,
    	document,
    	docElem,
    	documentIsHTML,
    	rbuggyQSA,
    	rbuggyMatches,
    	matches,
    	contains,

    	// Instance-specific data
    	expando = "sizzle" + 1 * new Date(),
    	preferredDoc = window.document,
    	dirruns = 0,
    	done = 0,
    	classCache = createCache(),
    	tokenCache = createCache(),
    	compilerCache = createCache(),
    	nonnativeSelectorCache = createCache(),
    	sortOrder = function( a, b ) {
    		if ( a === b ) {
    			hasDuplicate = true;
    		}
    		return 0;
    	},

    	// Instance methods
    	hasOwn = ( {} ).hasOwnProperty,
    	arr = [],
    	pop = arr.pop,
    	pushNative = arr.push,
    	push = arr.push,
    	slice = arr.slice,

    	// Use a stripped-down indexOf as it's faster than native
    	// https://jsperf.com/thor-indexof-vs-for/5
    	indexOf = function( list, elem ) {
    		var i = 0,
    			len = list.length;
    		for ( ; i < len; i++ ) {
    			if ( list[ i ] === elem ) {
    				return i;
    			}
    		}
    		return -1;
    	},

    	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|" +
    		"ismap|loop|multiple|open|readonly|required|scoped",

    	// Regular expressions

    	// http://www.w3.org/TR/css3-selectors/#whitespace
    	whitespace = "[\\x20\\t\\r\\n\\f]",

    	// https://www.w3.org/TR/css-syntax-3/#ident-token-diagram
    	identifier = "(?:\\\\[\\da-fA-F]{1,6}" + whitespace +
    		"?|\\\\[^\\r\\n\\f]|[\\w-]|[^\0-\\x7f])+",

    	// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
    	attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace +

    		// Operator (capture 2)
    		"*([*^$|!~]?=)" + whitespace +

    		// "Attribute values must be CSS identifiers [capture 5]
    		// or strings [capture 3 or capture 4]"
    		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" +
    		whitespace + "*\\]",

    	pseudos = ":(" + identifier + ")(?:\\((" +

    		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
    		// 1. quoted (capture 3; capture 4 or capture 5)
    		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +

    		// 2. simple (capture 6)
    		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +

    		// 3. anything else (capture 2)
    		".*" +
    		")\\)|)",

    	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
    	rwhitespace = new RegExp( whitespace + "+", "g" ),
    	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" +
    		whitespace + "+$", "g" ),

    	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
    	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace +
    		"*" ),
    	rdescend = new RegExp( whitespace + "|>" ),

    	rpseudo = new RegExp( pseudos ),
    	ridentifier = new RegExp( "^" + identifier + "$" ),

    	matchExpr = {
    		"ID": new RegExp( "^#(" + identifier + ")" ),
    		"CLASS": new RegExp( "^\\.(" + identifier + ")" ),
    		"TAG": new RegExp( "^(" + identifier + "|[*])" ),
    		"ATTR": new RegExp( "^" + attributes ),
    		"PSEUDO": new RegExp( "^" + pseudos ),
    		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" +
    			whitespace + "*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" +
    			whitespace + "*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
    		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),

    		// For use in libraries implementing .is()
    		// We use this for POS matching in `select`
    		"needsContext": new RegExp( "^" + whitespace +
    			"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + whitespace +
    			"*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
    	},

    	rhtml = /HTML$/i,
    	rinputs = /^(?:input|select|textarea|button)$/i,
    	rheader = /^h\d$/i,

    	rnative = /^[^{]+\{\s*\[native \w/,

    	// Easily-parseable/retrievable ID or TAG or CLASS selectors
    	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

    	rsibling = /[+~]/,

    	// CSS escapes
    	// http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
    	runescape = new RegExp( "\\\\[\\da-fA-F]{1,6}" + whitespace + "?|\\\\([^\\r\\n\\f])", "g" ),
    	funescape = function( escape, nonHex ) {
    		var high = "0x" + escape.slice( 1 ) - 0x10000;

    		return nonHex ?

    			// Strip the backslash prefix from a non-hex escape sequence
    			nonHex :

    			// Replace a hexadecimal escape sequence with the encoded Unicode code point
    			// Support: IE <=11+
    			// For values outside the Basic Multilingual Plane (BMP), manually construct a
    			// surrogate pair
    			high < 0 ?
    				String.fromCharCode( high + 0x10000 ) :
    				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
    	},

    	// CSS string/identifier serialization
    	// https://drafts.csswg.org/cssom/#common-serializing-idioms
    	rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,
    	fcssescape = function( ch, asCodePoint ) {
    		if ( asCodePoint ) {

    			// U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
    			if ( ch === "\0" ) {
    				return "\uFFFD";
    			}

    			// Control characters and (dependent upon position) numbers get escaped as code points
    			return ch.slice( 0, -1 ) + "\\" +
    				ch.charCodeAt( ch.length - 1 ).toString( 16 ) + " ";
    		}

    		// Other potentially-special ASCII characters get backslash-escaped
    		return "\\" + ch;
    	},

    	// Used for iframes
    	// See setDocument()
    	// Removing the function wrapper causes a "Permission Denied"
    	// error in IE
    	unloadHandler = function() {
    		setDocument();
    	},

    	inDisabledFieldset = addCombinator(
    		function( elem ) {
    			return elem.disabled === true && elem.nodeName.toLowerCase() === "fieldset";
    		},
    		{ dir: "parentNode", next: "legend" }
    	);

    // Optimize for push.apply( _, NodeList )
    try {
    	push.apply(
    		( arr = slice.call( preferredDoc.childNodes ) ),
    		preferredDoc.childNodes
    	);

    	// Support: Android<4.0
    	// Detect silently failing push.apply
    	// eslint-disable-next-line no-unused-expressions
    	arr[ preferredDoc.childNodes.length ].nodeType;
    } catch ( e ) {
    	push = { apply: arr.length ?

    		// Leverage slice if possible
    		function( target, els ) {
    			pushNative.apply( target, slice.call( els ) );
    		} :

    		// Support: IE<9
    		// Otherwise append directly
    		function( target, els ) {
    			var j = target.length,
    				i = 0;

    			// Can't trust NodeList.length
    			while ( ( target[ j++ ] = els[ i++ ] ) ) {}
    			target.length = j - 1;
    		}
    	};
    }

    function Sizzle( selector, context, results, seed ) {
    	var m, i, elem, nid, match, groups, newSelector,
    		newContext = context && context.ownerDocument,

    		// nodeType defaults to 9, since context defaults to document
    		nodeType = context ? context.nodeType : 9;

    	results = results || [];

    	// Return early from calls with invalid selector or context
    	if ( typeof selector !== "string" || !selector ||
    		nodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {

    		return results;
    	}

    	// Try to shortcut find operations (as opposed to filters) in HTML documents
    	if ( !seed ) {
    		setDocument( context );
    		context = context || document;

    		if ( documentIsHTML ) {

    			// If the selector is sufficiently simple, try using a "get*By*" DOM method
    			// (excepting DocumentFragment context, where the methods don't exist)
    			if ( nodeType !== 11 && ( match = rquickExpr.exec( selector ) ) ) {

    				// ID selector
    				if ( ( m = match[ 1 ] ) ) {

    					// Document context
    					if ( nodeType === 9 ) {
    						if ( ( elem = context.getElementById( m ) ) ) {

    							// Support: IE, Opera, Webkit
    							// TODO: identify versions
    							// getElementById can match elements by name instead of ID
    							if ( elem.id === m ) {
    								results.push( elem );
    								return results;
    							}
    						} else {
    							return results;
    						}

    					// Element context
    					} else {

    						// Support: IE, Opera, Webkit
    						// TODO: identify versions
    						// getElementById can match elements by name instead of ID
    						if ( newContext && ( elem = newContext.getElementById( m ) ) &&
    							contains( context, elem ) &&
    							elem.id === m ) {

    							results.push( elem );
    							return results;
    						}
    					}

    				// Type selector
    				} else if ( match[ 2 ] ) {
    					push.apply( results, context.getElementsByTagName( selector ) );
    					return results;

    				// Class selector
    				} else if ( ( m = match[ 3 ] ) && support.getElementsByClassName &&
    					context.getElementsByClassName ) {

    					push.apply( results, context.getElementsByClassName( m ) );
    					return results;
    				}
    			}

    			// Take advantage of querySelectorAll
    			if ( support.qsa &&
    				!nonnativeSelectorCache[ selector + " " ] &&
    				( !rbuggyQSA || !rbuggyQSA.test( selector ) ) &&

    				// Support: IE 8 only
    				// Exclude object elements
    				( nodeType !== 1 || context.nodeName.toLowerCase() !== "object" ) ) {

    				newSelector = selector;
    				newContext = context;

    				// qSA considers elements outside a scoping root when evaluating child or
    				// descendant combinators, which is not what we want.
    				// In such cases, we work around the behavior by prefixing every selector in the
    				// list with an ID selector referencing the scope context.
    				// The technique has to be used as well when a leading combinator is used
    				// as such selectors are not recognized by querySelectorAll.
    				// Thanks to Andrew Dupont for this technique.
    				if ( nodeType === 1 &&
    					( rdescend.test( selector ) || rcombinators.test( selector ) ) ) {

    					// Expand context for sibling selectors
    					newContext = rsibling.test( selector ) && testContext( context.parentNode ) ||
    						context;

    					// We can use :scope instead of the ID hack if the browser
    					// supports it & if we're not changing the context.
    					if ( newContext !== context || !support.scope ) {

    						// Capture the context ID, setting it first if necessary
    						if ( ( nid = context.getAttribute( "id" ) ) ) {
    							nid = nid.replace( rcssescape, fcssescape );
    						} else {
    							context.setAttribute( "id", ( nid = expando ) );
    						}
    					}

    					// Prefix every selector in the list
    					groups = tokenize( selector );
    					i = groups.length;
    					while ( i-- ) {
    						groups[ i ] = ( nid ? "#" + nid : ":scope" ) + " " +
    							toSelector( groups[ i ] );
    					}
    					newSelector = groups.join( "," );
    				}

    				try {
    					push.apply( results,
    						newContext.querySelectorAll( newSelector )
    					);
    					return results;
    				} catch ( qsaError ) {
    					nonnativeSelectorCache( selector, true );
    				} finally {
    					if ( nid === expando ) {
    						context.removeAttribute( "id" );
    					}
    				}
    			}
    		}
    	}

    	// All others
    	return select( selector.replace( rtrim, "$1" ), context, results, seed );
    }

    /**
     * Create key-value caches of limited size
     * @returns {function(string, object)} Returns the Object data after storing it on itself with
     *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
     *	deleting the oldest entry
     */
    function createCache() {
    	var keys = [];

    	function cache( key, value ) {

    		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
    		if ( keys.push( key + " " ) > Expr.cacheLength ) {

    			// Only keep the most recent entries
    			delete cache[ keys.shift() ];
    		}
    		return ( cache[ key + " " ] = value );
    	}
    	return cache;
    }

    /**
     * Mark a function for special use by Sizzle
     * @param {Function} fn The function to mark
     */
    function markFunction( fn ) {
    	fn[ expando ] = true;
    	return fn;
    }

    /**
     * Support testing using an element
     * @param {Function} fn Passed the created element and returns a boolean result
     */
    function assert( fn ) {
    	var el = document.createElement( "fieldset" );

    	try {
    		return !!fn( el );
    	} catch ( e ) {
    		return false;
    	} finally {

    		// Remove from its parent by default
    		if ( el.parentNode ) {
    			el.parentNode.removeChild( el );
    		}

    		// release memory in IE
    		el = null;
    	}
    }

    /**
     * Adds the same handler for all of the specified attrs
     * @param {String} attrs Pipe-separated list of attributes
     * @param {Function} handler The method that will be applied
     */
    function addHandle( attrs, handler ) {
    	var arr = attrs.split( "|" ),
    		i = arr.length;

    	while ( i-- ) {
    		Expr.attrHandle[ arr[ i ] ] = handler;
    	}
    }

    /**
     * Checks document order of two siblings
     * @param {Element} a
     * @param {Element} b
     * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
     */
    function siblingCheck( a, b ) {
    	var cur = b && a,
    		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
    			a.sourceIndex - b.sourceIndex;

    	// Use IE sourceIndex if available on both nodes
    	if ( diff ) {
    		return diff;
    	}

    	// Check if b follows a
    	if ( cur ) {
    		while ( ( cur = cur.nextSibling ) ) {
    			if ( cur === b ) {
    				return -1;
    			}
    		}
    	}

    	return a ? 1 : -1;
    }

    /**
     * Returns a function to use in pseudos for input types
     * @param {String} type
     */
    function createInputPseudo( type ) {
    	return function( elem ) {
    		var name = elem.nodeName.toLowerCase();
    		return name === "input" && elem.type === type;
    	};
    }

    /**
     * Returns a function to use in pseudos for buttons
     * @param {String} type
     */
    function createButtonPseudo( type ) {
    	return function( elem ) {
    		var name = elem.nodeName.toLowerCase();
    		return ( name === "input" || name === "button" ) && elem.type === type;
    	};
    }

    /**
     * Returns a function to use in pseudos for :enabled/:disabled
     * @param {Boolean} disabled true for :disabled; false for :enabled
     */
    function createDisabledPseudo( disabled ) {

    	// Known :disabled false positives: fieldset[disabled] > legend:nth-of-type(n+2) :can-disable
    	return function( elem ) {

    		// Only certain elements can match :enabled or :disabled
    		// https://html.spec.whatwg.org/multipage/scripting.html#selector-enabled
    		// https://html.spec.whatwg.org/multipage/scripting.html#selector-disabled
    		if ( "form" in elem ) {

    			// Check for inherited disabledness on relevant non-disabled elements:
    			// * listed form-associated elements in a disabled fieldset
    			//   https://html.spec.whatwg.org/multipage/forms.html#category-listed
    			//   https://html.spec.whatwg.org/multipage/forms.html#concept-fe-disabled
    			// * option elements in a disabled optgroup
    			//   https://html.spec.whatwg.org/multipage/forms.html#concept-option-disabled
    			// All such elements have a "form" property.
    			if ( elem.parentNode && elem.disabled === false ) {

    				// Option elements defer to a parent optgroup if present
    				if ( "label" in elem ) {
    					if ( "label" in elem.parentNode ) {
    						return elem.parentNode.disabled === disabled;
    					} else {
    						return elem.disabled === disabled;
    					}
    				}

    				// Support: IE 6 - 11
    				// Use the isDisabled shortcut property to check for disabled fieldset ancestors
    				return elem.isDisabled === disabled ||

    					// Where there is no isDisabled, check manually
    					/* jshint -W018 */
    					elem.isDisabled !== !disabled &&
    					inDisabledFieldset( elem ) === disabled;
    			}

    			return elem.disabled === disabled;

    		// Try to winnow out elements that can't be disabled before trusting the disabled property.
    		// Some victims get caught in our net (label, legend, menu, track), but it shouldn't
    		// even exist on them, let alone have a boolean value.
    		} else if ( "label" in elem ) {
    			return elem.disabled === disabled;
    		}

    		// Remaining elements are neither :enabled nor :disabled
    		return false;
    	};
    }

    /**
     * Returns a function to use in pseudos for positionals
     * @param {Function} fn
     */
    function createPositionalPseudo( fn ) {
    	return markFunction( function( argument ) {
    		argument = +argument;
    		return markFunction( function( seed, matches ) {
    			var j,
    				matchIndexes = fn( [], seed.length, argument ),
    				i = matchIndexes.length;

    			// Match elements found at the specified indexes
    			while ( i-- ) {
    				if ( seed[ ( j = matchIndexes[ i ] ) ] ) {
    					seed[ j ] = !( matches[ j ] = seed[ j ] );
    				}
    			}
    		} );
    	} );
    }

    /**
     * Checks a node for validity as a Sizzle context
     * @param {Element|Object=} context
     * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
     */
    function testContext( context ) {
    	return context && typeof context.getElementsByTagName !== "undefined" && context;
    }

    // Expose support vars for convenience
    support = Sizzle.support = {};

    /**
     * Detects XML nodes
     * @param {Element|Object} elem An element or a document
     * @returns {Boolean} True iff elem is a non-HTML XML node
     */
    isXML = Sizzle.isXML = function( elem ) {
    	var namespace = elem && elem.namespaceURI,
    		docElem = elem && ( elem.ownerDocument || elem ).documentElement;

    	// Support: IE <=8
    	// Assume HTML when documentElement doesn't yet exist, such as inside loading iframes
    	// https://bugs.jquery.com/ticket/4833
    	return !rhtml.test( namespace || docElem && docElem.nodeName || "HTML" );
    };

    /**
     * Sets document-related variables once based on the current document
     * @param {Element|Object} [doc] An element or document object to use to set the document
     * @returns {Object} Returns the current document
     */
    setDocument = Sizzle.setDocument = function( node ) {
    	var hasCompare, subWindow,
    		doc = node ? node.ownerDocument || node : preferredDoc;

    	// Return early if doc is invalid or already selected
    	// Support: IE 11+, Edge 17 - 18+
    	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
    	// two documents; shallow comparisons work.
    	// eslint-disable-next-line eqeqeq
    	if ( doc == document || doc.nodeType !== 9 || !doc.documentElement ) {
    		return document;
    	}

    	// Update global variables
    	document = doc;
    	docElem = document.documentElement;
    	documentIsHTML = !isXML( document );

    	// Support: IE 9 - 11+, Edge 12 - 18+
    	// Accessing iframe documents after unload throws "permission denied" errors (jQuery #13936)
    	// Support: IE 11+, Edge 17 - 18+
    	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
    	// two documents; shallow comparisons work.
    	// eslint-disable-next-line eqeqeq
    	if ( preferredDoc != document &&
    		( subWindow = document.defaultView ) && subWindow.top !== subWindow ) {

    		// Support: IE 11, Edge
    		if ( subWindow.addEventListener ) {
    			subWindow.addEventListener( "unload", unloadHandler, false );

    		// Support: IE 9 - 10 only
    		} else if ( subWindow.attachEvent ) {
    			subWindow.attachEvent( "onunload", unloadHandler );
    		}
    	}

    	// Support: IE 8 - 11+, Edge 12 - 18+, Chrome <=16 - 25 only, Firefox <=3.6 - 31 only,
    	// Safari 4 - 5 only, Opera <=11.6 - 12.x only
    	// IE/Edge & older browsers don't support the :scope pseudo-class.
    	// Support: Safari 6.0 only
    	// Safari 6.0 supports :scope but it's an alias of :root there.
    	support.scope = assert( function( el ) {
    		docElem.appendChild( el ).appendChild( document.createElement( "div" ) );
    		return typeof el.querySelectorAll !== "undefined" &&
    			!el.querySelectorAll( ":scope fieldset div" ).length;
    	} );

    	/* Attributes
    	---------------------------------------------------------------------- */

    	// Support: IE<8
    	// Verify that getAttribute really returns attributes and not properties
    	// (excepting IE8 booleans)
    	support.attributes = assert( function( el ) {
    		el.className = "i";
    		return !el.getAttribute( "className" );
    	} );

    	/* getElement(s)By*
    	---------------------------------------------------------------------- */

    	// Check if getElementsByTagName("*") returns only elements
    	support.getElementsByTagName = assert( function( el ) {
    		el.appendChild( document.createComment( "" ) );
    		return !el.getElementsByTagName( "*" ).length;
    	} );

    	// Support: IE<9
    	support.getElementsByClassName = rnative.test( document.getElementsByClassName );

    	// Support: IE<10
    	// Check if getElementById returns elements by name
    	// The broken getElementById methods don't pick up programmatically-set names,
    	// so use a roundabout getElementsByName test
    	support.getById = assert( function( el ) {
    		docElem.appendChild( el ).id = expando;
    		return !document.getElementsByName || !document.getElementsByName( expando ).length;
    	} );

    	// ID filter and find
    	if ( support.getById ) {
    		Expr.filter[ "ID" ] = function( id ) {
    			var attrId = id.replace( runescape, funescape );
    			return function( elem ) {
    				return elem.getAttribute( "id" ) === attrId;
    			};
    		};
    		Expr.find[ "ID" ] = function( id, context ) {
    			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
    				var elem = context.getElementById( id );
    				return elem ? [ elem ] : [];
    			}
    		};
    	} else {
    		Expr.filter[ "ID" ] =  function( id ) {
    			var attrId = id.replace( runescape, funescape );
    			return function( elem ) {
    				var node = typeof elem.getAttributeNode !== "undefined" &&
    					elem.getAttributeNode( "id" );
    				return node && node.value === attrId;
    			};
    		};

    		// Support: IE 6 - 7 only
    		// getElementById is not reliable as a find shortcut
    		Expr.find[ "ID" ] = function( id, context ) {
    			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
    				var node, i, elems,
    					elem = context.getElementById( id );

    				if ( elem ) {

    					// Verify the id attribute
    					node = elem.getAttributeNode( "id" );
    					if ( node && node.value === id ) {
    						return [ elem ];
    					}

    					// Fall back on getElementsByName
    					elems = context.getElementsByName( id );
    					i = 0;
    					while ( ( elem = elems[ i++ ] ) ) {
    						node = elem.getAttributeNode( "id" );
    						if ( node && node.value === id ) {
    							return [ elem ];
    						}
    					}
    				}

    				return [];
    			}
    		};
    	}

    	// Tag
    	Expr.find[ "TAG" ] = support.getElementsByTagName ?
    		function( tag, context ) {
    			if ( typeof context.getElementsByTagName !== "undefined" ) {
    				return context.getElementsByTagName( tag );

    			// DocumentFragment nodes don't have gEBTN
    			} else if ( support.qsa ) {
    				return context.querySelectorAll( tag );
    			}
    		} :

    		function( tag, context ) {
    			var elem,
    				tmp = [],
    				i = 0,

    				// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
    				results = context.getElementsByTagName( tag );

    			// Filter out possible comments
    			if ( tag === "*" ) {
    				while ( ( elem = results[ i++ ] ) ) {
    					if ( elem.nodeType === 1 ) {
    						tmp.push( elem );
    					}
    				}

    				return tmp;
    			}
    			return results;
    		};

    	// Class
    	Expr.find[ "CLASS" ] = support.getElementsByClassName && function( className, context ) {
    		if ( typeof context.getElementsByClassName !== "undefined" && documentIsHTML ) {
    			return context.getElementsByClassName( className );
    		}
    	};

    	/* QSA/matchesSelector
    	---------------------------------------------------------------------- */

    	// QSA and matchesSelector support

    	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
    	rbuggyMatches = [];

    	// qSa(:focus) reports false when true (Chrome 21)
    	// We allow this because of a bug in IE8/9 that throws an error
    	// whenever `document.activeElement` is accessed on an iframe
    	// So, we allow :focus to pass through QSA all the time to avoid the IE error
    	// See https://bugs.jquery.com/ticket/13378
    	rbuggyQSA = [];

    	if ( ( support.qsa = rnative.test( document.querySelectorAll ) ) ) {

    		// Build QSA regex
    		// Regex strategy adopted from Diego Perini
    		assert( function( el ) {

    			var input;

    			// Select is set to empty string on purpose
    			// This is to test IE's treatment of not explicitly
    			// setting a boolean content attribute,
    			// since its presence should be enough
    			// https://bugs.jquery.com/ticket/12359
    			docElem.appendChild( el ).innerHTML = "<a id='" + expando + "'></a>" +
    				"<select id='" + expando + "-\r\\' msallowcapture=''>" +
    				"<option selected=''></option></select>";

    			// Support: IE8, Opera 11-12.16
    			// Nothing should be selected when empty strings follow ^= or $= or *=
    			// The test attribute must be unknown in Opera but "safe" for WinRT
    			// https://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
    			if ( el.querySelectorAll( "[msallowcapture^='']" ).length ) {
    				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
    			}

    			// Support: IE8
    			// Boolean attributes and "value" are not treated correctly
    			if ( !el.querySelectorAll( "[selected]" ).length ) {
    				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
    			}

    			// Support: Chrome<29, Android<4.4, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.8+
    			if ( !el.querySelectorAll( "[id~=" + expando + "-]" ).length ) {
    				rbuggyQSA.push( "~=" );
    			}

    			// Support: IE 11+, Edge 15 - 18+
    			// IE 11/Edge don't find elements on a `[name='']` query in some cases.
    			// Adding a temporary attribute to the document before the selection works
    			// around the issue.
    			// Interestingly, IE 10 & older don't seem to have the issue.
    			input = document.createElement( "input" );
    			input.setAttribute( "name", "" );
    			el.appendChild( input );
    			if ( !el.querySelectorAll( "[name='']" ).length ) {
    				rbuggyQSA.push( "\\[" + whitespace + "*name" + whitespace + "*=" +
    					whitespace + "*(?:''|\"\")" );
    			}

    			// Webkit/Opera - :checked should return selected option elements
    			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
    			// IE8 throws error here and will not see later tests
    			if ( !el.querySelectorAll( ":checked" ).length ) {
    				rbuggyQSA.push( ":checked" );
    			}

    			// Support: Safari 8+, iOS 8+
    			// https://bugs.webkit.org/show_bug.cgi?id=136851
    			// In-page `selector#id sibling-combinator selector` fails
    			if ( !el.querySelectorAll( "a#" + expando + "+*" ).length ) {
    				rbuggyQSA.push( ".#.+[+~]" );
    			}

    			// Support: Firefox <=3.6 - 5 only
    			// Old Firefox doesn't throw on a badly-escaped identifier.
    			el.querySelectorAll( "\\\f" );
    			rbuggyQSA.push( "[\\r\\n\\f]" );
    		} );

    		assert( function( el ) {
    			el.innerHTML = "<a href='' disabled='disabled'></a>" +
    				"<select disabled='disabled'><option/></select>";

    			// Support: Windows 8 Native Apps
    			// The type and name attributes are restricted during .innerHTML assignment
    			var input = document.createElement( "input" );
    			input.setAttribute( "type", "hidden" );
    			el.appendChild( input ).setAttribute( "name", "D" );

    			// Support: IE8
    			// Enforce case-sensitivity of name attribute
    			if ( el.querySelectorAll( "[name=d]" ).length ) {
    				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
    			}

    			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
    			// IE8 throws error here and will not see later tests
    			if ( el.querySelectorAll( ":enabled" ).length !== 2 ) {
    				rbuggyQSA.push( ":enabled", ":disabled" );
    			}

    			// Support: IE9-11+
    			// IE's :disabled selector does not pick up the children of disabled fieldsets
    			docElem.appendChild( el ).disabled = true;
    			if ( el.querySelectorAll( ":disabled" ).length !== 2 ) {
    				rbuggyQSA.push( ":enabled", ":disabled" );
    			}

    			// Support: Opera 10 - 11 only
    			// Opera 10-11 does not throw on post-comma invalid pseudos
    			el.querySelectorAll( "*,:x" );
    			rbuggyQSA.push( ",.*:" );
    		} );
    	}

    	if ( ( support.matchesSelector = rnative.test( ( matches = docElem.matches ||
    		docElem.webkitMatchesSelector ||
    		docElem.mozMatchesSelector ||
    		docElem.oMatchesSelector ||
    		docElem.msMatchesSelector ) ) ) ) {

    		assert( function( el ) {

    			// Check to see if it's possible to do matchesSelector
    			// on a disconnected node (IE 9)
    			support.disconnectedMatch = matches.call( el, "*" );

    			// This should fail with an exception
    			// Gecko does not error, returns false instead
    			matches.call( el, "[s!='']:x" );
    			rbuggyMatches.push( "!=", pseudos );
    		} );
    	}

    	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join( "|" ) );
    	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join( "|" ) );

    	/* Contains
    	---------------------------------------------------------------------- */
    	hasCompare = rnative.test( docElem.compareDocumentPosition );

    	// Element contains another
    	// Purposefully self-exclusive
    	// As in, an element does not contain itself
    	contains = hasCompare || rnative.test( docElem.contains ) ?
    		function( a, b ) {
    			var adown = a.nodeType === 9 ? a.documentElement : a,
    				bup = b && b.parentNode;
    			return a === bup || !!( bup && bup.nodeType === 1 && (
    				adown.contains ?
    					adown.contains( bup ) :
    					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
    			) );
    		} :
    		function( a, b ) {
    			if ( b ) {
    				while ( ( b = b.parentNode ) ) {
    					if ( b === a ) {
    						return true;
    					}
    				}
    			}
    			return false;
    		};

    	/* Sorting
    	---------------------------------------------------------------------- */

    	// Document order sorting
    	sortOrder = hasCompare ?
    	function( a, b ) {

    		// Flag for duplicate removal
    		if ( a === b ) {
    			hasDuplicate = true;
    			return 0;
    		}

    		// Sort on method existence if only one input has compareDocumentPosition
    		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
    		if ( compare ) {
    			return compare;
    		}

    		// Calculate position if both inputs belong to the same document
    		// Support: IE 11+, Edge 17 - 18+
    		// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
    		// two documents; shallow comparisons work.
    		// eslint-disable-next-line eqeqeq
    		compare = ( a.ownerDocument || a ) == ( b.ownerDocument || b ) ?
    			a.compareDocumentPosition( b ) :

    			// Otherwise we know they are disconnected
    			1;

    		// Disconnected nodes
    		if ( compare & 1 ||
    			( !support.sortDetached && b.compareDocumentPosition( a ) === compare ) ) {

    			// Choose the first element that is related to our preferred document
    			// Support: IE 11+, Edge 17 - 18+
    			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
    			// two documents; shallow comparisons work.
    			// eslint-disable-next-line eqeqeq
    			if ( a == document || a.ownerDocument == preferredDoc &&
    				contains( preferredDoc, a ) ) {
    				return -1;
    			}

    			// Support: IE 11+, Edge 17 - 18+
    			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
    			// two documents; shallow comparisons work.
    			// eslint-disable-next-line eqeqeq
    			if ( b == document || b.ownerDocument == preferredDoc &&
    				contains( preferredDoc, b ) ) {
    				return 1;
    			}

    			// Maintain original order
    			return sortInput ?
    				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
    				0;
    		}

    		return compare & 4 ? -1 : 1;
    	} :
    	function( a, b ) {

    		// Exit early if the nodes are identical
    		if ( a === b ) {
    			hasDuplicate = true;
    			return 0;
    		}

    		var cur,
    			i = 0,
    			aup = a.parentNode,
    			bup = b.parentNode,
    			ap = [ a ],
    			bp = [ b ];

    		// Parentless nodes are either documents or disconnected
    		if ( !aup || !bup ) {

    			// Support: IE 11+, Edge 17 - 18+
    			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
    			// two documents; shallow comparisons work.
    			/* eslint-disable eqeqeq */
    			return a == document ? -1 :
    				b == document ? 1 :
    				/* eslint-enable eqeqeq */
    				aup ? -1 :
    				bup ? 1 :
    				sortInput ?
    				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
    				0;

    		// If the nodes are siblings, we can do a quick check
    		} else if ( aup === bup ) {
    			return siblingCheck( a, b );
    		}

    		// Otherwise we need full lists of their ancestors for comparison
    		cur = a;
    		while ( ( cur = cur.parentNode ) ) {
    			ap.unshift( cur );
    		}
    		cur = b;
    		while ( ( cur = cur.parentNode ) ) {
    			bp.unshift( cur );
    		}

    		// Walk down the tree looking for a discrepancy
    		while ( ap[ i ] === bp[ i ] ) {
    			i++;
    		}

    		return i ?

    			// Do a sibling check if the nodes have a common ancestor
    			siblingCheck( ap[ i ], bp[ i ] ) :

    			// Otherwise nodes in our document sort first
    			// Support: IE 11+, Edge 17 - 18+
    			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
    			// two documents; shallow comparisons work.
    			/* eslint-disable eqeqeq */
    			ap[ i ] == preferredDoc ? -1 :
    			bp[ i ] == preferredDoc ? 1 :
    			/* eslint-enable eqeqeq */
    			0;
    	};

    	return document;
    };

    Sizzle.matches = function( expr, elements ) {
    	return Sizzle( expr, null, null, elements );
    };

    Sizzle.matchesSelector = function( elem, expr ) {
    	setDocument( elem );

    	if ( support.matchesSelector && documentIsHTML &&
    		!nonnativeSelectorCache[ expr + " " ] &&
    		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
    		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

    		try {
    			var ret = matches.call( elem, expr );

    			// IE 9's matchesSelector returns false on disconnected nodes
    			if ( ret || support.disconnectedMatch ||

    				// As well, disconnected nodes are said to be in a document
    				// fragment in IE 9
    				elem.document && elem.document.nodeType !== 11 ) {
    				return ret;
    			}
    		} catch ( e ) {
    			nonnativeSelectorCache( expr, true );
    		}
    	}

    	return Sizzle( expr, document, null, [ elem ] ).length > 0;
    };

    Sizzle.contains = function( context, elem ) {

    	// Set document vars if needed
    	// Support: IE 11+, Edge 17 - 18+
    	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
    	// two documents; shallow comparisons work.
    	// eslint-disable-next-line eqeqeq
    	if ( ( context.ownerDocument || context ) != document ) {
    		setDocument( context );
    	}
    	return contains( context, elem );
    };

    Sizzle.attr = function( elem, name ) {

    	// Set document vars if needed
    	// Support: IE 11+, Edge 17 - 18+
    	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
    	// two documents; shallow comparisons work.
    	// eslint-disable-next-line eqeqeq
    	if ( ( elem.ownerDocument || elem ) != document ) {
    		setDocument( elem );
    	}

    	var fn = Expr.attrHandle[ name.toLowerCase() ],

    		// Don't get fooled by Object.prototype properties (jQuery #13807)
    		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
    			fn( elem, name, !documentIsHTML ) :
    			undefined;

    	return val !== undefined ?
    		val :
    		support.attributes || !documentIsHTML ?
    			elem.getAttribute( name ) :
    			( val = elem.getAttributeNode( name ) ) && val.specified ?
    				val.value :
    				null;
    };

    Sizzle.escape = function( sel ) {
    	return ( sel + "" ).replace( rcssescape, fcssescape );
    };

    Sizzle.error = function( msg ) {
    	throw new Error( "Syntax error, unrecognized expression: " + msg );
    };

    /**
     * Document sorting and removing duplicates
     * @param {ArrayLike} results
     */
    Sizzle.uniqueSort = function( results ) {
    	var elem,
    		duplicates = [],
    		j = 0,
    		i = 0;

    	// Unless we *know* we can detect duplicates, assume their presence
    	hasDuplicate = !support.detectDuplicates;
    	sortInput = !support.sortStable && results.slice( 0 );
    	results.sort( sortOrder );

    	if ( hasDuplicate ) {
    		while ( ( elem = results[ i++ ] ) ) {
    			if ( elem === results[ i ] ) {
    				j = duplicates.push( i );
    			}
    		}
    		while ( j-- ) {
    			results.splice( duplicates[ j ], 1 );
    		}
    	}

    	// Clear input after sorting to release objects
    	// See https://github.com/jquery/sizzle/pull/225
    	sortInput = null;

    	return results;
    };

    /**
     * Utility function for retrieving the text value of an array of DOM nodes
     * @param {Array|Element} elem
     */
    getText = Sizzle.getText = function( elem ) {
    	var node,
    		ret = "",
    		i = 0,
    		nodeType = elem.nodeType;

    	if ( !nodeType ) {

    		// If no nodeType, this is expected to be an array
    		while ( ( node = elem[ i++ ] ) ) {

    			// Do not traverse comment nodes
    			ret += getText( node );
    		}
    	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {

    		// Use textContent for elements
    		// innerText usage removed for consistency of new lines (jQuery #11153)
    		if ( typeof elem.textContent === "string" ) {
    			return elem.textContent;
    		} else {

    			// Traverse its children
    			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
    				ret += getText( elem );
    			}
    		}
    	} else if ( nodeType === 3 || nodeType === 4 ) {
    		return elem.nodeValue;
    	}

    	// Do not include comment or processing instruction nodes

    	return ret;
    };

    Expr = Sizzle.selectors = {

    	// Can be adjusted by the user
    	cacheLength: 50,

    	createPseudo: markFunction,

    	match: matchExpr,

    	attrHandle: {},

    	find: {},

    	relative: {
    		">": { dir: "parentNode", first: true },
    		" ": { dir: "parentNode" },
    		"+": { dir: "previousSibling", first: true },
    		"~": { dir: "previousSibling" }
    	},

    	preFilter: {
    		"ATTR": function( match ) {
    			match[ 1 ] = match[ 1 ].replace( runescape, funescape );

    			// Move the given value to match[3] whether quoted or unquoted
    			match[ 3 ] = ( match[ 3 ] || match[ 4 ] ||
    				match[ 5 ] || "" ).replace( runescape, funescape );

    			if ( match[ 2 ] === "~=" ) {
    				match[ 3 ] = " " + match[ 3 ] + " ";
    			}

    			return match.slice( 0, 4 );
    		},

    		"CHILD": function( match ) {

    			/* matches from matchExpr["CHILD"]
    				1 type (only|nth|...)
    				2 what (child|of-type)
    				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
    				4 xn-component of xn+y argument ([+-]?\d*n|)
    				5 sign of xn-component
    				6 x of xn-component
    				7 sign of y-component
    				8 y of y-component
    			*/
    			match[ 1 ] = match[ 1 ].toLowerCase();

    			if ( match[ 1 ].slice( 0, 3 ) === "nth" ) {

    				// nth-* requires argument
    				if ( !match[ 3 ] ) {
    					Sizzle.error( match[ 0 ] );
    				}

    				// numeric x and y parameters for Expr.filter.CHILD
    				// remember that false/true cast respectively to 0/1
    				match[ 4 ] = +( match[ 4 ] ?
    					match[ 5 ] + ( match[ 6 ] || 1 ) :
    					2 * ( match[ 3 ] === "even" || match[ 3 ] === "odd" ) );
    				match[ 5 ] = +( ( match[ 7 ] + match[ 8 ] ) || match[ 3 ] === "odd" );

    				// other types prohibit arguments
    			} else if ( match[ 3 ] ) {
    				Sizzle.error( match[ 0 ] );
    			}

    			return match;
    		},

    		"PSEUDO": function( match ) {
    			var excess,
    				unquoted = !match[ 6 ] && match[ 2 ];

    			if ( matchExpr[ "CHILD" ].test( match[ 0 ] ) ) {
    				return null;
    			}

    			// Accept quoted arguments as-is
    			if ( match[ 3 ] ) {
    				match[ 2 ] = match[ 4 ] || match[ 5 ] || "";

    			// Strip excess characters from unquoted arguments
    			} else if ( unquoted && rpseudo.test( unquoted ) &&

    				// Get excess from tokenize (recursively)
    				( excess = tokenize( unquoted, true ) ) &&

    				// advance to the next closing parenthesis
    				( excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length ) ) {

    				// excess is a negative index
    				match[ 0 ] = match[ 0 ].slice( 0, excess );
    				match[ 2 ] = unquoted.slice( 0, excess );
    			}

    			// Return only captures needed by the pseudo filter method (type and argument)
    			return match.slice( 0, 3 );
    		}
    	},

    	filter: {

    		"TAG": function( nodeNameSelector ) {
    			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
    			return nodeNameSelector === "*" ?
    				function() {
    					return true;
    				} :
    				function( elem ) {
    					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
    				};
    		},

    		"CLASS": function( className ) {
    			var pattern = classCache[ className + " " ];

    			return pattern ||
    				( pattern = new RegExp( "(^|" + whitespace +
    					")" + className + "(" + whitespace + "|$)" ) ) && classCache(
    						className, function( elem ) {
    							return pattern.test(
    								typeof elem.className === "string" && elem.className ||
    								typeof elem.getAttribute !== "undefined" &&
    									elem.getAttribute( "class" ) ||
    								""
    							);
    				} );
    		},

    		"ATTR": function( name, operator, check ) {
    			return function( elem ) {
    				var result = Sizzle.attr( elem, name );

    				if ( result == null ) {
    					return operator === "!=";
    				}
    				if ( !operator ) {
    					return true;
    				}

    				result += "";

    				/* eslint-disable max-len */

    				return operator === "=" ? result === check :
    					operator === "!=" ? result !== check :
    					operator === "^=" ? check && result.indexOf( check ) === 0 :
    					operator === "*=" ? check && result.indexOf( check ) > -1 :
    					operator === "$=" ? check && result.slice( -check.length ) === check :
    					operator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :
    					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
    					false;
    				/* eslint-enable max-len */

    			};
    		},

    		"CHILD": function( type, what, _argument, first, last ) {
    			var simple = type.slice( 0, 3 ) !== "nth",
    				forward = type.slice( -4 ) !== "last",
    				ofType = what === "of-type";

    			return first === 1 && last === 0 ?

    				// Shortcut for :nth-*(n)
    				function( elem ) {
    					return !!elem.parentNode;
    				} :

    				function( elem, _context, xml ) {
    					var cache, uniqueCache, outerCache, node, nodeIndex, start,
    						dir = simple !== forward ? "nextSibling" : "previousSibling",
    						parent = elem.parentNode,
    						name = ofType && elem.nodeName.toLowerCase(),
    						useCache = !xml && !ofType,
    						diff = false;

    					if ( parent ) {

    						// :(first|last|only)-(child|of-type)
    						if ( simple ) {
    							while ( dir ) {
    								node = elem;
    								while ( ( node = node[ dir ] ) ) {
    									if ( ofType ?
    										node.nodeName.toLowerCase() === name :
    										node.nodeType === 1 ) {

    										return false;
    									}
    								}

    								// Reverse direction for :only-* (if we haven't yet done so)
    								start = dir = type === "only" && !start && "nextSibling";
    							}
    							return true;
    						}

    						start = [ forward ? parent.firstChild : parent.lastChild ];

    						// non-xml :nth-child(...) stores cache data on `parent`
    						if ( forward && useCache ) {

    							// Seek `elem` from a previously-cached index

    							// ...in a gzip-friendly way
    							node = parent;
    							outerCache = node[ expando ] || ( node[ expando ] = {} );

    							// Support: IE <9 only
    							// Defend against cloned attroperties (jQuery gh-1709)
    							uniqueCache = outerCache[ node.uniqueID ] ||
    								( outerCache[ node.uniqueID ] = {} );

    							cache = uniqueCache[ type ] || [];
    							nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
    							diff = nodeIndex && cache[ 2 ];
    							node = nodeIndex && parent.childNodes[ nodeIndex ];

    							while ( ( node = ++nodeIndex && node && node[ dir ] ||

    								// Fallback to seeking `elem` from the start
    								( diff = nodeIndex = 0 ) || start.pop() ) ) {

    								// When found, cache indexes on `parent` and break
    								if ( node.nodeType === 1 && ++diff && node === elem ) {
    									uniqueCache[ type ] = [ dirruns, nodeIndex, diff ];
    									break;
    								}
    							}

    						} else {

    							// Use previously-cached element index if available
    							if ( useCache ) {

    								// ...in a gzip-friendly way
    								node = elem;
    								outerCache = node[ expando ] || ( node[ expando ] = {} );

    								// Support: IE <9 only
    								// Defend against cloned attroperties (jQuery gh-1709)
    								uniqueCache = outerCache[ node.uniqueID ] ||
    									( outerCache[ node.uniqueID ] = {} );

    								cache = uniqueCache[ type ] || [];
    								nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
    								diff = nodeIndex;
    							}

    							// xml :nth-child(...)
    							// or :nth-last-child(...) or :nth(-last)?-of-type(...)
    							if ( diff === false ) {

    								// Use the same loop as above to seek `elem` from the start
    								while ( ( node = ++nodeIndex && node && node[ dir ] ||
    									( diff = nodeIndex = 0 ) || start.pop() ) ) {

    									if ( ( ofType ?
    										node.nodeName.toLowerCase() === name :
    										node.nodeType === 1 ) &&
    										++diff ) {

    										// Cache the index of each encountered element
    										if ( useCache ) {
    											outerCache = node[ expando ] ||
    												( node[ expando ] = {} );

    											// Support: IE <9 only
    											// Defend against cloned attroperties (jQuery gh-1709)
    											uniqueCache = outerCache[ node.uniqueID ] ||
    												( outerCache[ node.uniqueID ] = {} );

    											uniqueCache[ type ] = [ dirruns, diff ];
    										}

    										if ( node === elem ) {
    											break;
    										}
    									}
    								}
    							}
    						}

    						// Incorporate the offset, then check against cycle size
    						diff -= last;
    						return diff === first || ( diff % first === 0 && diff / first >= 0 );
    					}
    				};
    		},

    		"PSEUDO": function( pseudo, argument ) {

    			// pseudo-class names are case-insensitive
    			// http://www.w3.org/TR/selectors/#pseudo-classes
    			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
    			// Remember that setFilters inherits from pseudos
    			var args,
    				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
    					Sizzle.error( "unsupported pseudo: " + pseudo );

    			// The user may use createPseudo to indicate that
    			// arguments are needed to create the filter function
    			// just as Sizzle does
    			if ( fn[ expando ] ) {
    				return fn( argument );
    			}

    			// But maintain support for old signatures
    			if ( fn.length > 1 ) {
    				args = [ pseudo, pseudo, "", argument ];
    				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
    					markFunction( function( seed, matches ) {
    						var idx,
    							matched = fn( seed, argument ),
    							i = matched.length;
    						while ( i-- ) {
    							idx = indexOf( seed, matched[ i ] );
    							seed[ idx ] = !( matches[ idx ] = matched[ i ] );
    						}
    					} ) :
    					function( elem ) {
    						return fn( elem, 0, args );
    					};
    			}

    			return fn;
    		}
    	},

    	pseudos: {

    		// Potentially complex pseudos
    		"not": markFunction( function( selector ) {

    			// Trim the selector passed to compile
    			// to avoid treating leading and trailing
    			// spaces as combinators
    			var input = [],
    				results = [],
    				matcher = compile( selector.replace( rtrim, "$1" ) );

    			return matcher[ expando ] ?
    				markFunction( function( seed, matches, _context, xml ) {
    					var elem,
    						unmatched = matcher( seed, null, xml, [] ),
    						i = seed.length;

    					// Match elements unmatched by `matcher`
    					while ( i-- ) {
    						if ( ( elem = unmatched[ i ] ) ) {
    							seed[ i ] = !( matches[ i ] = elem );
    						}
    					}
    				} ) :
    				function( elem, _context, xml ) {
    					input[ 0 ] = elem;
    					matcher( input, null, xml, results );

    					// Don't keep the element (issue #299)
    					input[ 0 ] = null;
    					return !results.pop();
    				};
    		} ),

    		"has": markFunction( function( selector ) {
    			return function( elem ) {
    				return Sizzle( selector, elem ).length > 0;
    			};
    		} ),

    		"contains": markFunction( function( text ) {
    			text = text.replace( runescape, funescape );
    			return function( elem ) {
    				return ( elem.textContent || getText( elem ) ).indexOf( text ) > -1;
    			};
    		} ),

    		// "Whether an element is represented by a :lang() selector
    		// is based solely on the element's language value
    		// being equal to the identifier C,
    		// or beginning with the identifier C immediately followed by "-".
    		// The matching of C against the element's language value is performed case-insensitively.
    		// The identifier C does not have to be a valid language name."
    		// http://www.w3.org/TR/selectors/#lang-pseudo
    		"lang": markFunction( function( lang ) {

    			// lang value must be a valid identifier
    			if ( !ridentifier.test( lang || "" ) ) {
    				Sizzle.error( "unsupported lang: " + lang );
    			}
    			lang = lang.replace( runescape, funescape ).toLowerCase();
    			return function( elem ) {
    				var elemLang;
    				do {
    					if ( ( elemLang = documentIsHTML ?
    						elem.lang :
    						elem.getAttribute( "xml:lang" ) || elem.getAttribute( "lang" ) ) ) {

    						elemLang = elemLang.toLowerCase();
    						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
    					}
    				} while ( ( elem = elem.parentNode ) && elem.nodeType === 1 );
    				return false;
    			};
    		} ),

    		// Miscellaneous
    		"target": function( elem ) {
    			var hash = window.location && window.location.hash;
    			return hash && hash.slice( 1 ) === elem.id;
    		},

    		"root": function( elem ) {
    			return elem === docElem;
    		},

    		"focus": function( elem ) {
    			return elem === document.activeElement &&
    				( !document.hasFocus || document.hasFocus() ) &&
    				!!( elem.type || elem.href || ~elem.tabIndex );
    		},

    		// Boolean properties
    		"enabled": createDisabledPseudo( false ),
    		"disabled": createDisabledPseudo( true ),

    		"checked": function( elem ) {

    			// In CSS3, :checked should return both checked and selected elements
    			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
    			var nodeName = elem.nodeName.toLowerCase();
    			return ( nodeName === "input" && !!elem.checked ) ||
    				( nodeName === "option" && !!elem.selected );
    		},

    		"selected": function( elem ) {

    			// Accessing this property makes selected-by-default
    			// options in Safari work properly
    			if ( elem.parentNode ) {
    				// eslint-disable-next-line no-unused-expressions
    				elem.parentNode.selectedIndex;
    			}

    			return elem.selected === true;
    		},

    		// Contents
    		"empty": function( elem ) {

    			// http://www.w3.org/TR/selectors/#empty-pseudo
    			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
    			//   but not by others (comment: 8; processing instruction: 7; etc.)
    			// nodeType < 6 works because attributes (2) do not appear as children
    			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
    				if ( elem.nodeType < 6 ) {
    					return false;
    				}
    			}
    			return true;
    		},

    		"parent": function( elem ) {
    			return !Expr.pseudos[ "empty" ]( elem );
    		},

    		// Element/input types
    		"header": function( elem ) {
    			return rheader.test( elem.nodeName );
    		},

    		"input": function( elem ) {
    			return rinputs.test( elem.nodeName );
    		},

    		"button": function( elem ) {
    			var name = elem.nodeName.toLowerCase();
    			return name === "input" && elem.type === "button" || name === "button";
    		},

    		"text": function( elem ) {
    			var attr;
    			return elem.nodeName.toLowerCase() === "input" &&
    				elem.type === "text" &&

    				// Support: IE<8
    				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
    				( ( attr = elem.getAttribute( "type" ) ) == null ||
    					attr.toLowerCase() === "text" );
    		},

    		// Position-in-collection
    		"first": createPositionalPseudo( function() {
    			return [ 0 ];
    		} ),

    		"last": createPositionalPseudo( function( _matchIndexes, length ) {
    			return [ length - 1 ];
    		} ),

    		"eq": createPositionalPseudo( function( _matchIndexes, length, argument ) {
    			return [ argument < 0 ? argument + length : argument ];
    		} ),

    		"even": createPositionalPseudo( function( matchIndexes, length ) {
    			var i = 0;
    			for ( ; i < length; i += 2 ) {
    				matchIndexes.push( i );
    			}
    			return matchIndexes;
    		} ),

    		"odd": createPositionalPseudo( function( matchIndexes, length ) {
    			var i = 1;
    			for ( ; i < length; i += 2 ) {
    				matchIndexes.push( i );
    			}
    			return matchIndexes;
    		} ),

    		"lt": createPositionalPseudo( function( matchIndexes, length, argument ) {
    			var i = argument < 0 ?
    				argument + length :
    				argument > length ?
    					length :
    					argument;
    			for ( ; --i >= 0; ) {
    				matchIndexes.push( i );
    			}
    			return matchIndexes;
    		} ),

    		"gt": createPositionalPseudo( function( matchIndexes, length, argument ) {
    			var i = argument < 0 ? argument + length : argument;
    			for ( ; ++i < length; ) {
    				matchIndexes.push( i );
    			}
    			return matchIndexes;
    		} )
    	}
    };

    Expr.pseudos[ "nth" ] = Expr.pseudos[ "eq" ];

    // Add button/input type pseudos
    for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
    	Expr.pseudos[ i ] = createInputPseudo( i );
    }
    for ( i in { submit: true, reset: true } ) {
    	Expr.pseudos[ i ] = createButtonPseudo( i );
    }

    // Easy API for creating new setFilters
    function setFilters() {}
    setFilters.prototype = Expr.filters = Expr.pseudos;
    Expr.setFilters = new setFilters();

    tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
    	var matched, match, tokens, type,
    		soFar, groups, preFilters,
    		cached = tokenCache[ selector + " " ];

    	if ( cached ) {
    		return parseOnly ? 0 : cached.slice( 0 );
    	}

    	soFar = selector;
    	groups = [];
    	preFilters = Expr.preFilter;

    	while ( soFar ) {

    		// Comma and first run
    		if ( !matched || ( match = rcomma.exec( soFar ) ) ) {
    			if ( match ) {

    				// Don't consume trailing commas as valid
    				soFar = soFar.slice( match[ 0 ].length ) || soFar;
    			}
    			groups.push( ( tokens = [] ) );
    		}

    		matched = false;

    		// Combinators
    		if ( ( match = rcombinators.exec( soFar ) ) ) {
    			matched = match.shift();
    			tokens.push( {
    				value: matched,

    				// Cast descendant combinators to space
    				type: match[ 0 ].replace( rtrim, " " )
    			} );
    			soFar = soFar.slice( matched.length );
    		}

    		// Filters
    		for ( type in Expr.filter ) {
    			if ( ( match = matchExpr[ type ].exec( soFar ) ) && ( !preFilters[ type ] ||
    				( match = preFilters[ type ]( match ) ) ) ) {
    				matched = match.shift();
    				tokens.push( {
    					value: matched,
    					type: type,
    					matches: match
    				} );
    				soFar = soFar.slice( matched.length );
    			}
    		}

    		if ( !matched ) {
    			break;
    		}
    	}

    	// Return the length of the invalid excess
    	// if we're just parsing
    	// Otherwise, throw an error or return tokens
    	return parseOnly ?
    		soFar.length :
    		soFar ?
    			Sizzle.error( selector ) :

    			// Cache the tokens
    			tokenCache( selector, groups ).slice( 0 );
    };

    function toSelector( tokens ) {
    	var i = 0,
    		len = tokens.length,
    		selector = "";
    	for ( ; i < len; i++ ) {
    		selector += tokens[ i ].value;
    	}
    	return selector;
    }

    function addCombinator( matcher, combinator, base ) {
    	var dir = combinator.dir,
    		skip = combinator.next,
    		key = skip || dir,
    		checkNonElements = base && key === "parentNode",
    		doneName = done++;

    	return combinator.first ?

    		// Check against closest ancestor/preceding element
    		function( elem, context, xml ) {
    			while ( ( elem = elem[ dir ] ) ) {
    				if ( elem.nodeType === 1 || checkNonElements ) {
    					return matcher( elem, context, xml );
    				}
    			}
    			return false;
    		} :

    		// Check against all ancestor/preceding elements
    		function( elem, context, xml ) {
    			var oldCache, uniqueCache, outerCache,
    				newCache = [ dirruns, doneName ];

    			// We can't set arbitrary data on XML nodes, so they don't benefit from combinator caching
    			if ( xml ) {
    				while ( ( elem = elem[ dir ] ) ) {
    					if ( elem.nodeType === 1 || checkNonElements ) {
    						if ( matcher( elem, context, xml ) ) {
    							return true;
    						}
    					}
    				}
    			} else {
    				while ( ( elem = elem[ dir ] ) ) {
    					if ( elem.nodeType === 1 || checkNonElements ) {
    						outerCache = elem[ expando ] || ( elem[ expando ] = {} );

    						// Support: IE <9 only
    						// Defend against cloned attroperties (jQuery gh-1709)
    						uniqueCache = outerCache[ elem.uniqueID ] ||
    							( outerCache[ elem.uniqueID ] = {} );

    						if ( skip && skip === elem.nodeName.toLowerCase() ) {
    							elem = elem[ dir ] || elem;
    						} else if ( ( oldCache = uniqueCache[ key ] ) &&
    							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

    							// Assign to newCache so results back-propagate to previous elements
    							return ( newCache[ 2 ] = oldCache[ 2 ] );
    						} else {

    							// Reuse newcache so results back-propagate to previous elements
    							uniqueCache[ key ] = newCache;

    							// A match means we're done; a fail means we have to keep checking
    							if ( ( newCache[ 2 ] = matcher( elem, context, xml ) ) ) {
    								return true;
    							}
    						}
    					}
    				}
    			}
    			return false;
    		};
    }

    function elementMatcher( matchers ) {
    	return matchers.length > 1 ?
    		function( elem, context, xml ) {
    			var i = matchers.length;
    			while ( i-- ) {
    				if ( !matchers[ i ]( elem, context, xml ) ) {
    					return false;
    				}
    			}
    			return true;
    		} :
    		matchers[ 0 ];
    }

    function multipleContexts( selector, contexts, results ) {
    	var i = 0,
    		len = contexts.length;
    	for ( ; i < len; i++ ) {
    		Sizzle( selector, contexts[ i ], results );
    	}
    	return results;
    }

    function condense( unmatched, map, filter, context, xml ) {
    	var elem,
    		newUnmatched = [],
    		i = 0,
    		len = unmatched.length,
    		mapped = map != null;

    	for ( ; i < len; i++ ) {
    		if ( ( elem = unmatched[ i ] ) ) {
    			if ( !filter || filter( elem, context, xml ) ) {
    				newUnmatched.push( elem );
    				if ( mapped ) {
    					map.push( i );
    				}
    			}
    		}
    	}

    	return newUnmatched;
    }

    function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
    	if ( postFilter && !postFilter[ expando ] ) {
    		postFilter = setMatcher( postFilter );
    	}
    	if ( postFinder && !postFinder[ expando ] ) {
    		postFinder = setMatcher( postFinder, postSelector );
    	}
    	return markFunction( function( seed, results, context, xml ) {
    		var temp, i, elem,
    			preMap = [],
    			postMap = [],
    			preexisting = results.length,

    			// Get initial elements from seed or context
    			elems = seed || multipleContexts(
    				selector || "*",
    				context.nodeType ? [ context ] : context,
    				[]
    			),

    			// Prefilter to get matcher input, preserving a map for seed-results synchronization
    			matcherIn = preFilter && ( seed || !selector ) ?
    				condense( elems, preMap, preFilter, context, xml ) :
    				elems,

    			matcherOut = matcher ?

    				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
    				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

    					// ...intermediate processing is necessary
    					[] :

    					// ...otherwise use results directly
    					results :
    				matcherIn;

    		// Find primary matches
    		if ( matcher ) {
    			matcher( matcherIn, matcherOut, context, xml );
    		}

    		// Apply postFilter
    		if ( postFilter ) {
    			temp = condense( matcherOut, postMap );
    			postFilter( temp, [], context, xml );

    			// Un-match failing elements by moving them back to matcherIn
    			i = temp.length;
    			while ( i-- ) {
    				if ( ( elem = temp[ i ] ) ) {
    					matcherOut[ postMap[ i ] ] = !( matcherIn[ postMap[ i ] ] = elem );
    				}
    			}
    		}

    		if ( seed ) {
    			if ( postFinder || preFilter ) {
    				if ( postFinder ) {

    					// Get the final matcherOut by condensing this intermediate into postFinder contexts
    					temp = [];
    					i = matcherOut.length;
    					while ( i-- ) {
    						if ( ( elem = matcherOut[ i ] ) ) {

    							// Restore matcherIn since elem is not yet a final match
    							temp.push( ( matcherIn[ i ] = elem ) );
    						}
    					}
    					postFinder( null, ( matcherOut = [] ), temp, xml );
    				}

    				// Move matched elements from seed to results to keep them synchronized
    				i = matcherOut.length;
    				while ( i-- ) {
    					if ( ( elem = matcherOut[ i ] ) &&
    						( temp = postFinder ? indexOf( seed, elem ) : preMap[ i ] ) > -1 ) {

    						seed[ temp ] = !( results[ temp ] = elem );
    					}
    				}
    			}

    		// Add elements to results, through postFinder if defined
    		} else {
    			matcherOut = condense(
    				matcherOut === results ?
    					matcherOut.splice( preexisting, matcherOut.length ) :
    					matcherOut
    			);
    			if ( postFinder ) {
    				postFinder( null, results, matcherOut, xml );
    			} else {
    				push.apply( results, matcherOut );
    			}
    		}
    	} );
    }

    function matcherFromTokens( tokens ) {
    	var checkContext, matcher, j,
    		len = tokens.length,
    		leadingRelative = Expr.relative[ tokens[ 0 ].type ],
    		implicitRelative = leadingRelative || Expr.relative[ " " ],
    		i = leadingRelative ? 1 : 0,

    		// The foundational matcher ensures that elements are reachable from top-level context(s)
    		matchContext = addCombinator( function( elem ) {
    			return elem === checkContext;
    		}, implicitRelative, true ),
    		matchAnyContext = addCombinator( function( elem ) {
    			return indexOf( checkContext, elem ) > -1;
    		}, implicitRelative, true ),
    		matchers = [ function( elem, context, xml ) {
    			var ret = ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
    				( checkContext = context ).nodeType ?
    					matchContext( elem, context, xml ) :
    					matchAnyContext( elem, context, xml ) );

    			// Avoid hanging onto element (issue #299)
    			checkContext = null;
    			return ret;
    		} ];

    	for ( ; i < len; i++ ) {
    		if ( ( matcher = Expr.relative[ tokens[ i ].type ] ) ) {
    			matchers = [ addCombinator( elementMatcher( matchers ), matcher ) ];
    		} else {
    			matcher = Expr.filter[ tokens[ i ].type ].apply( null, tokens[ i ].matches );

    			// Return special upon seeing a positional matcher
    			if ( matcher[ expando ] ) {

    				// Find the next relative operator (if any) for proper handling
    				j = ++i;
    				for ( ; j < len; j++ ) {
    					if ( Expr.relative[ tokens[ j ].type ] ) {
    						break;
    					}
    				}
    				return setMatcher(
    					i > 1 && elementMatcher( matchers ),
    					i > 1 && toSelector(

    					// If the preceding token was a descendant combinator, insert an implicit any-element `*`
    					tokens
    						.slice( 0, i - 1 )
    						.concat( { value: tokens[ i - 2 ].type === " " ? "*" : "" } )
    					).replace( rtrim, "$1" ),
    					matcher,
    					i < j && matcherFromTokens( tokens.slice( i, j ) ),
    					j < len && matcherFromTokens( ( tokens = tokens.slice( j ) ) ),
    					j < len && toSelector( tokens )
    				);
    			}
    			matchers.push( matcher );
    		}
    	}

    	return elementMatcher( matchers );
    }

    function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
    	var bySet = setMatchers.length > 0,
    		byElement = elementMatchers.length > 0,
    		superMatcher = function( seed, context, xml, results, outermost ) {
    			var elem, j, matcher,
    				matchedCount = 0,
    				i = "0",
    				unmatched = seed && [],
    				setMatched = [],
    				contextBackup = outermostContext,

    				// We must always have either seed elements or outermost context
    				elems = seed || byElement && Expr.find[ "TAG" ]( "*", outermost ),

    				// Use integer dirruns iff this is the outermost matcher
    				dirrunsUnique = ( dirruns += contextBackup == null ? 1 : Math.random() || 0.1 ),
    				len = elems.length;

    			if ( outermost ) {

    				// Support: IE 11+, Edge 17 - 18+
    				// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
    				// two documents; shallow comparisons work.
    				// eslint-disable-next-line eqeqeq
    				outermostContext = context == document || context || outermost;
    			}

    			// Add elements passing elementMatchers directly to results
    			// Support: IE<9, Safari
    			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
    			for ( ; i !== len && ( elem = elems[ i ] ) != null; i++ ) {
    				if ( byElement && elem ) {
    					j = 0;

    					// Support: IE 11+, Edge 17 - 18+
    					// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
    					// two documents; shallow comparisons work.
    					// eslint-disable-next-line eqeqeq
    					if ( !context && elem.ownerDocument != document ) {
    						setDocument( elem );
    						xml = !documentIsHTML;
    					}
    					while ( ( matcher = elementMatchers[ j++ ] ) ) {
    						if ( matcher( elem, context || document, xml ) ) {
    							results.push( elem );
    							break;
    						}
    					}
    					if ( outermost ) {
    						dirruns = dirrunsUnique;
    					}
    				}

    				// Track unmatched elements for set filters
    				if ( bySet ) {

    					// They will have gone through all possible matchers
    					if ( ( elem = !matcher && elem ) ) {
    						matchedCount--;
    					}

    					// Lengthen the array for every element, matched or not
    					if ( seed ) {
    						unmatched.push( elem );
    					}
    				}
    			}

    			// `i` is now the count of elements visited above, and adding it to `matchedCount`
    			// makes the latter nonnegative.
    			matchedCount += i;

    			// Apply set filters to unmatched elements
    			// NOTE: This can be skipped if there are no unmatched elements (i.e., `matchedCount`
    			// equals `i`), unless we didn't visit _any_ elements in the above loop because we have
    			// no element matchers and no seed.
    			// Incrementing an initially-string "0" `i` allows `i` to remain a string only in that
    			// case, which will result in a "00" `matchedCount` that differs from `i` but is also
    			// numerically zero.
    			if ( bySet && i !== matchedCount ) {
    				j = 0;
    				while ( ( matcher = setMatchers[ j++ ] ) ) {
    					matcher( unmatched, setMatched, context, xml );
    				}

    				if ( seed ) {

    					// Reintegrate element matches to eliminate the need for sorting
    					if ( matchedCount > 0 ) {
    						while ( i-- ) {
    							if ( !( unmatched[ i ] || setMatched[ i ] ) ) {
    								setMatched[ i ] = pop.call( results );
    							}
    						}
    					}

    					// Discard index placeholder values to get only actual matches
    					setMatched = condense( setMatched );
    				}

    				// Add matches to results
    				push.apply( results, setMatched );

    				// Seedless set matches succeeding multiple successful matchers stipulate sorting
    				if ( outermost && !seed && setMatched.length > 0 &&
    					( matchedCount + setMatchers.length ) > 1 ) {

    					Sizzle.uniqueSort( results );
    				}
    			}

    			// Override manipulation of globals by nested matchers
    			if ( outermost ) {
    				dirruns = dirrunsUnique;
    				outermostContext = contextBackup;
    			}

    			return unmatched;
    		};

    	return bySet ?
    		markFunction( superMatcher ) :
    		superMatcher;
    }

    compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
    	var i,
    		setMatchers = [],
    		elementMatchers = [],
    		cached = compilerCache[ selector + " " ];

    	if ( !cached ) {

    		// Generate a function of recursive functions that can be used to check each element
    		if ( !match ) {
    			match = tokenize( selector );
    		}
    		i = match.length;
    		while ( i-- ) {
    			cached = matcherFromTokens( match[ i ] );
    			if ( cached[ expando ] ) {
    				setMatchers.push( cached );
    			} else {
    				elementMatchers.push( cached );
    			}
    		}

    		// Cache the compiled function
    		cached = compilerCache(
    			selector,
    			matcherFromGroupMatchers( elementMatchers, setMatchers )
    		);

    		// Save selector and tokenization
    		cached.selector = selector;
    	}
    	return cached;
    };

    /**
     * A low-level selection function that works with Sizzle's compiled
     *  selector functions
     * @param {String|Function} selector A selector or a pre-compiled
     *  selector function built with Sizzle.compile
     * @param {Element} context
     * @param {Array} [results]
     * @param {Array} [seed] A set of elements to match against
     */
    select = Sizzle.select = function( selector, context, results, seed ) {
    	var i, tokens, token, type, find,
    		compiled = typeof selector === "function" && selector,
    		match = !seed && tokenize( ( selector = compiled.selector || selector ) );

    	results = results || [];

    	// Try to minimize operations if there is only one selector in the list and no seed
    	// (the latter of which guarantees us context)
    	if ( match.length === 1 ) {

    		// Reduce context if the leading compound selector is an ID
    		tokens = match[ 0 ] = match[ 0 ].slice( 0 );
    		if ( tokens.length > 2 && ( token = tokens[ 0 ] ).type === "ID" &&
    			context.nodeType === 9 && documentIsHTML && Expr.relative[ tokens[ 1 ].type ] ) {

    			context = ( Expr.find[ "ID" ]( token.matches[ 0 ]
    				.replace( runescape, funescape ), context ) || [] )[ 0 ];
    			if ( !context ) {
    				return results;

    			// Precompiled matchers will still verify ancestry, so step up a level
    			} else if ( compiled ) {
    				context = context.parentNode;
    			}

    			selector = selector.slice( tokens.shift().value.length );
    		}

    		// Fetch a seed set for right-to-left matching
    		i = matchExpr[ "needsContext" ].test( selector ) ? 0 : tokens.length;
    		while ( i-- ) {
    			token = tokens[ i ];

    			// Abort if we hit a combinator
    			if ( Expr.relative[ ( type = token.type ) ] ) {
    				break;
    			}
    			if ( ( find = Expr.find[ type ] ) ) {

    				// Search, expanding context for leading sibling combinators
    				if ( ( seed = find(
    					token.matches[ 0 ].replace( runescape, funescape ),
    					rsibling.test( tokens[ 0 ].type ) && testContext( context.parentNode ) ||
    						context
    				) ) ) {

    					// If seed is empty or no tokens remain, we can return early
    					tokens.splice( i, 1 );
    					selector = seed.length && toSelector( tokens );
    					if ( !selector ) {
    						push.apply( results, seed );
    						return results;
    					}

    					break;
    				}
    			}
    		}
    	}

    	// Compile and execute a filtering function if one is not provided
    	// Provide `match` to avoid retokenization if we modified the selector above
    	( compiled || compile( selector, match ) )(
    		seed,
    		context,
    		!documentIsHTML,
    		results,
    		!context || rsibling.test( selector ) && testContext( context.parentNode ) || context
    	);
    	return results;
    };

    // One-time assignments

    // Sort stability
    support.sortStable = expando.split( "" ).sort( sortOrder ).join( "" ) === expando;

    // Support: Chrome 14-35+
    // Always assume duplicates if they aren't passed to the comparison function
    support.detectDuplicates = !!hasDuplicate;

    // Initialize against the default document
    setDocument();

    // Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
    // Detached nodes confoundingly follow *each other*
    support.sortDetached = assert( function( el ) {

    	// Should return 1, but returns 4 (following)
    	return el.compareDocumentPosition( document.createElement( "fieldset" ) ) & 1;
    } );

    // Support: IE<8
    // Prevent attribute/property "interpolation"
    // https://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
    if ( !assert( function( el ) {
    	el.innerHTML = "<a href='#'></a>";
    	return el.firstChild.getAttribute( "href" ) === "#";
    } ) ) {
    	addHandle( "type|href|height|width", function( elem, name, isXML ) {
    		if ( !isXML ) {
    			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
    		}
    	} );
    }

    // Support: IE<9
    // Use defaultValue in place of getAttribute("value")
    if ( !support.attributes || !assert( function( el ) {
    	el.innerHTML = "<input/>";
    	el.firstChild.setAttribute( "value", "" );
    	return el.firstChild.getAttribute( "value" ) === "";
    } ) ) {
    	addHandle( "value", function( elem, _name, isXML ) {
    		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
    			return elem.defaultValue;
    		}
    	} );
    }

    // Support: IE<9
    // Use getAttributeNode to fetch booleans when getAttribute lies
    if ( !assert( function( el ) {
    	return el.getAttribute( "disabled" ) == null;
    } ) ) {
    	addHandle( booleans, function( elem, name, isXML ) {
    		var val;
    		if ( !isXML ) {
    			return elem[ name ] === true ? name.toLowerCase() :
    				( val = elem.getAttributeNode( name ) ) && val.specified ?
    					val.value :
    					null;
    		}
    	} );
    }

    return Sizzle;

    } )( window );



    jQuery.find = Sizzle;
    jQuery.expr = Sizzle.selectors;

    // Deprecated
    jQuery.expr[ ":" ] = jQuery.expr.pseudos;
    jQuery.uniqueSort = jQuery.unique = Sizzle.uniqueSort;
    jQuery.text = Sizzle.getText;
    jQuery.isXMLDoc = Sizzle.isXML;
    jQuery.contains = Sizzle.contains;
    jQuery.escapeSelector = Sizzle.escape;




    var dir = function( elem, dir, until ) {
    	var matched = [],
    		truncate = until !== undefined;

    	while ( ( elem = elem[ dir ] ) && elem.nodeType !== 9 ) {
    		if ( elem.nodeType === 1 ) {
    			if ( truncate && jQuery( elem ).is( until ) ) {
    				break;
    			}
    			matched.push( elem );
    		}
    	}
    	return matched;
    };


    var siblings = function( n, elem ) {
    	var matched = [];

    	for ( ; n; n = n.nextSibling ) {
    		if ( n.nodeType === 1 && n !== elem ) {
    			matched.push( n );
    		}
    	}

    	return matched;
    };


    var rneedsContext = jQuery.expr.match.needsContext;



    function nodeName( elem, name ) {

    	return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();

    }
    var rsingleTag = ( /^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i );



    // Implement the identical functionality for filter and not
    function winnow( elements, qualifier, not ) {
    	if ( isFunction( qualifier ) ) {
    		return jQuery.grep( elements, function( elem, i ) {
    			return !!qualifier.call( elem, i, elem ) !== not;
    		} );
    	}

    	// Single element
    	if ( qualifier.nodeType ) {
    		return jQuery.grep( elements, function( elem ) {
    			return ( elem === qualifier ) !== not;
    		} );
    	}

    	// Arraylike of elements (jQuery, arguments, Array)
    	if ( typeof qualifier !== "string" ) {
    		return jQuery.grep( elements, function( elem ) {
    			return ( indexOf.call( qualifier, elem ) > -1 ) !== not;
    		} );
    	}

    	// Filtered directly for both simple and complex selectors
    	return jQuery.filter( qualifier, elements, not );
    }

    jQuery.filter = function( expr, elems, not ) {
    	var elem = elems[ 0 ];

    	if ( not ) {
    		expr = ":not(" + expr + ")";
    	}

    	if ( elems.length === 1 && elem.nodeType === 1 ) {
    		return jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [];
    	}

    	return jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
    		return elem.nodeType === 1;
    	} ) );
    };

    jQuery.fn.extend( {
    	find: function( selector ) {
    		var i, ret,
    			len = this.length,
    			self = this;

    		if ( typeof selector !== "string" ) {
    			return this.pushStack( jQuery( selector ).filter( function() {
    				for ( i = 0; i < len; i++ ) {
    					if ( jQuery.contains( self[ i ], this ) ) {
    						return true;
    					}
    				}
    			} ) );
    		}

    		ret = this.pushStack( [] );

    		for ( i = 0; i < len; i++ ) {
    			jQuery.find( selector, self[ i ], ret );
    		}

    		return len > 1 ? jQuery.uniqueSort( ret ) : ret;
    	},
    	filter: function( selector ) {
    		return this.pushStack( winnow( this, selector || [], false ) );
    	},
    	not: function( selector ) {
    		return this.pushStack( winnow( this, selector || [], true ) );
    	},
    	is: function( selector ) {
    		return !!winnow(
    			this,

    			// If this is a positional/relative selector, check membership in the returned set
    			// so $("p:first").is("p:last") won't return true for a doc with two "p".
    			typeof selector === "string" && rneedsContext.test( selector ) ?
    				jQuery( selector ) :
    				selector || [],
    			false
    		).length;
    	}
    } );


    // Initialize a jQuery object


    // A central reference to the root jQuery(document)
    var rootjQuery,

    	// A simple way to check for HTML strings
    	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
    	// Strict HTML recognition (#11290: must start with <)
    	// Shortcut simple #id case for speed
    	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/,

    	init = jQuery.fn.init = function( selector, context, root ) {
    		var match, elem;

    		// HANDLE: $(""), $(null), $(undefined), $(false)
    		if ( !selector ) {
    			return this;
    		}

    		// Method init() accepts an alternate rootjQuery
    		// so migrate can support jQuery.sub (gh-2101)
    		root = root || rootjQuery;

    		// Handle HTML strings
    		if ( typeof selector === "string" ) {
    			if ( selector[ 0 ] === "<" &&
    				selector[ selector.length - 1 ] === ">" &&
    				selector.length >= 3 ) {

    				// Assume that strings that start and end with <> are HTML and skip the regex check
    				match = [ null, selector, null ];

    			} else {
    				match = rquickExpr.exec( selector );
    			}

    			// Match html or make sure no context is specified for #id
    			if ( match && ( match[ 1 ] || !context ) ) {

    				// HANDLE: $(html) -> $(array)
    				if ( match[ 1 ] ) {
    					context = context instanceof jQuery ? context[ 0 ] : context;

    					// Option to run scripts is true for back-compat
    					// Intentionally let the error be thrown if parseHTML is not present
    					jQuery.merge( this, jQuery.parseHTML(
    						match[ 1 ],
    						context && context.nodeType ? context.ownerDocument || context : document,
    						true
    					) );

    					// HANDLE: $(html, props)
    					if ( rsingleTag.test( match[ 1 ] ) && jQuery.isPlainObject( context ) ) {
    						for ( match in context ) {

    							// Properties of context are called as methods if possible
    							if ( isFunction( this[ match ] ) ) {
    								this[ match ]( context[ match ] );

    							// ...and otherwise set as attributes
    							} else {
    								this.attr( match, context[ match ] );
    							}
    						}
    					}

    					return this;

    				// HANDLE: $(#id)
    				} else {
    					elem = document.getElementById( match[ 2 ] );

    					if ( elem ) {

    						// Inject the element directly into the jQuery object
    						this[ 0 ] = elem;
    						this.length = 1;
    					}
    					return this;
    				}

    			// HANDLE: $(expr, $(...))
    			} else if ( !context || context.jquery ) {
    				return ( context || root ).find( selector );

    			// HANDLE: $(expr, context)
    			// (which is just equivalent to: $(context).find(expr)
    			} else {
    				return this.constructor( context ).find( selector );
    			}

    		// HANDLE: $(DOMElement)
    		} else if ( selector.nodeType ) {
    			this[ 0 ] = selector;
    			this.length = 1;
    			return this;

    		// HANDLE: $(function)
    		// Shortcut for document ready
    		} else if ( isFunction( selector ) ) {
    			return root.ready !== undefined ?
    				root.ready( selector ) :

    				// Execute immediately if ready is not present
    				selector( jQuery );
    		}

    		return jQuery.makeArray( selector, this );
    	};

    // Give the init function the jQuery prototype for later instantiation
    init.prototype = jQuery.fn;

    // Initialize central reference
    rootjQuery = jQuery( document );


    var rparentsprev = /^(?:parents|prev(?:Until|All))/,

    	// Methods guaranteed to produce a unique set when starting from a unique set
    	guaranteedUnique = {
    		children: true,
    		contents: true,
    		next: true,
    		prev: true
    	};

    jQuery.fn.extend( {
    	has: function( target ) {
    		var targets = jQuery( target, this ),
    			l = targets.length;

    		return this.filter( function() {
    			var i = 0;
    			for ( ; i < l; i++ ) {
    				if ( jQuery.contains( this, targets[ i ] ) ) {
    					return true;
    				}
    			}
    		} );
    	},

    	closest: function( selectors, context ) {
    		var cur,
    			i = 0,
    			l = this.length,
    			matched = [],
    			targets = typeof selectors !== "string" && jQuery( selectors );

    		// Positional selectors never match, since there's no _selection_ context
    		if ( !rneedsContext.test( selectors ) ) {
    			for ( ; i < l; i++ ) {
    				for ( cur = this[ i ]; cur && cur !== context; cur = cur.parentNode ) {

    					// Always skip document fragments
    					if ( cur.nodeType < 11 && ( targets ?
    						targets.index( cur ) > -1 :

    						// Don't pass non-elements to Sizzle
    						cur.nodeType === 1 &&
    							jQuery.find.matchesSelector( cur, selectors ) ) ) {

    						matched.push( cur );
    						break;
    					}
    				}
    			}
    		}

    		return this.pushStack( matched.length > 1 ? jQuery.uniqueSort( matched ) : matched );
    	},

    	// Determine the position of an element within the set
    	index: function( elem ) {

    		// No argument, return index in parent
    		if ( !elem ) {
    			return ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;
    		}

    		// Index in selector
    		if ( typeof elem === "string" ) {
    			return indexOf.call( jQuery( elem ), this[ 0 ] );
    		}

    		// Locate the position of the desired element
    		return indexOf.call( this,

    			// If it receives a jQuery object, the first element is used
    			elem.jquery ? elem[ 0 ] : elem
    		);
    	},

    	add: function( selector, context ) {
    		return this.pushStack(
    			jQuery.uniqueSort(
    				jQuery.merge( this.get(), jQuery( selector, context ) )
    			)
    		);
    	},

    	addBack: function( selector ) {
    		return this.add( selector == null ?
    			this.prevObject : this.prevObject.filter( selector )
    		);
    	}
    } );

    function sibling( cur, dir ) {
    	while ( ( cur = cur[ dir ] ) && cur.nodeType !== 1 ) {}
    	return cur;
    }

    jQuery.each( {
    	parent: function( elem ) {
    		var parent = elem.parentNode;
    		return parent && parent.nodeType !== 11 ? parent : null;
    	},
    	parents: function( elem ) {
    		return dir( elem, "parentNode" );
    	},
    	parentsUntil: function( elem, _i, until ) {
    		return dir( elem, "parentNode", until );
    	},
    	next: function( elem ) {
    		return sibling( elem, "nextSibling" );
    	},
    	prev: function( elem ) {
    		return sibling( elem, "previousSibling" );
    	},
    	nextAll: function( elem ) {
    		return dir( elem, "nextSibling" );
    	},
    	prevAll: function( elem ) {
    		return dir( elem, "previousSibling" );
    	},
    	nextUntil: function( elem, _i, until ) {
    		return dir( elem, "nextSibling", until );
    	},
    	prevUntil: function( elem, _i, until ) {
    		return dir( elem, "previousSibling", until );
    	},
    	siblings: function( elem ) {
    		return siblings( ( elem.parentNode || {} ).firstChild, elem );
    	},
    	children: function( elem ) {
    		return siblings( elem.firstChild );
    	},
    	contents: function( elem ) {
    		if ( elem.contentDocument != null &&

    			// Support: IE 11+
    			// <object> elements with no `data` attribute has an object
    			// `contentDocument` with a `null` prototype.
    			getProto( elem.contentDocument ) ) {

    			return elem.contentDocument;
    		}

    		// Support: IE 9 - 11 only, iOS 7 only, Android Browser <=4.3 only
    		// Treat the template element as a regular one in browsers that
    		// don't support it.
    		if ( nodeName( elem, "template" ) ) {
    			elem = elem.content || elem;
    		}

    		return jQuery.merge( [], elem.childNodes );
    	}
    }, function( name, fn ) {
    	jQuery.fn[ name ] = function( until, selector ) {
    		var matched = jQuery.map( this, fn, until );

    		if ( name.slice( -5 ) !== "Until" ) {
    			selector = until;
    		}

    		if ( selector && typeof selector === "string" ) {
    			matched = jQuery.filter( selector, matched );
    		}

    		if ( this.length > 1 ) {

    			// Remove duplicates
    			if ( !guaranteedUnique[ name ] ) {
    				jQuery.uniqueSort( matched );
    			}

    			// Reverse order for parents* and prev-derivatives
    			if ( rparentsprev.test( name ) ) {
    				matched.reverse();
    			}
    		}

    		return this.pushStack( matched );
    	};
    } );
    var rnothtmlwhite = ( /[^\x20\t\r\n\f]+/g );



    // Convert String-formatted options into Object-formatted ones
    function createOptions( options ) {
    	var object = {};
    	jQuery.each( options.match( rnothtmlwhite ) || [], function( _, flag ) {
    		object[ flag ] = true;
    	} );
    	return object;
    }

    /*
     * Create a callback list using the following parameters:
     *
     *	options: an optional list of space-separated options that will change how
     *			the callback list behaves or a more traditional option object
     *
     * By default a callback list will act like an event callback list and can be
     * "fired" multiple times.
     *
     * Possible options:
     *
     *	once:			will ensure the callback list can only be fired once (like a Deferred)
     *
     *	memory:			will keep track of previous values and will call any callback added
     *					after the list has been fired right away with the latest "memorized"
     *					values (like a Deferred)
     *
     *	unique:			will ensure a callback can only be added once (no duplicate in the list)
     *
     *	stopOnFalse:	interrupt callings when a callback returns false
     *
     */
    jQuery.Callbacks = function( options ) {

    	// Convert options from String-formatted to Object-formatted if needed
    	// (we check in cache first)
    	options = typeof options === "string" ?
    		createOptions( options ) :
    		jQuery.extend( {}, options );

    	var // Flag to know if list is currently firing
    		firing,

    		// Last fire value for non-forgettable lists
    		memory,

    		// Flag to know if list was already fired
    		fired,

    		// Flag to prevent firing
    		locked,

    		// Actual callback list
    		list = [],

    		// Queue of execution data for repeatable lists
    		queue = [],

    		// Index of currently firing callback (modified by add/remove as needed)
    		firingIndex = -1,

    		// Fire callbacks
    		fire = function() {

    			// Enforce single-firing
    			locked = locked || options.once;

    			// Execute callbacks for all pending executions,
    			// respecting firingIndex overrides and runtime changes
    			fired = firing = true;
    			for ( ; queue.length; firingIndex = -1 ) {
    				memory = queue.shift();
    				while ( ++firingIndex < list.length ) {

    					// Run callback and check for early termination
    					if ( list[ firingIndex ].apply( memory[ 0 ], memory[ 1 ] ) === false &&
    						options.stopOnFalse ) {

    						// Jump to end and forget the data so .add doesn't re-fire
    						firingIndex = list.length;
    						memory = false;
    					}
    				}
    			}

    			// Forget the data if we're done with it
    			if ( !options.memory ) {
    				memory = false;
    			}

    			firing = false;

    			// Clean up if we're done firing for good
    			if ( locked ) {

    				// Keep an empty list if we have data for future add calls
    				if ( memory ) {
    					list = [];

    				// Otherwise, this object is spent
    				} else {
    					list = "";
    				}
    			}
    		},

    		// Actual Callbacks object
    		self = {

    			// Add a callback or a collection of callbacks to the list
    			add: function() {
    				if ( list ) {

    					// If we have memory from a past run, we should fire after adding
    					if ( memory && !firing ) {
    						firingIndex = list.length - 1;
    						queue.push( memory );
    					}

    					( function add( args ) {
    						jQuery.each( args, function( _, arg ) {
    							if ( isFunction( arg ) ) {
    								if ( !options.unique || !self.has( arg ) ) {
    									list.push( arg );
    								}
    							} else if ( arg && arg.length && toType( arg ) !== "string" ) {

    								// Inspect recursively
    								add( arg );
    							}
    						} );
    					} )( arguments );

    					if ( memory && !firing ) {
    						fire();
    					}
    				}
    				return this;
    			},

    			// Remove a callback from the list
    			remove: function() {
    				jQuery.each( arguments, function( _, arg ) {
    					var index;
    					while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
    						list.splice( index, 1 );

    						// Handle firing indexes
    						if ( index <= firingIndex ) {
    							firingIndex--;
    						}
    					}
    				} );
    				return this;
    			},

    			// Check if a given callback is in the list.
    			// If no argument is given, return whether or not list has callbacks attached.
    			has: function( fn ) {
    				return fn ?
    					jQuery.inArray( fn, list ) > -1 :
    					list.length > 0;
    			},

    			// Remove all callbacks from the list
    			empty: function() {
    				if ( list ) {
    					list = [];
    				}
    				return this;
    			},

    			// Disable .fire and .add
    			// Abort any current/pending executions
    			// Clear all callbacks and values
    			disable: function() {
    				locked = queue = [];
    				list = memory = "";
    				return this;
    			},
    			disabled: function() {
    				return !list;
    			},

    			// Disable .fire
    			// Also disable .add unless we have memory (since it would have no effect)
    			// Abort any pending executions
    			lock: function() {
    				locked = queue = [];
    				if ( !memory && !firing ) {
    					list = memory = "";
    				}
    				return this;
    			},
    			locked: function() {
    				return !!locked;
    			},

    			// Call all callbacks with the given context and arguments
    			fireWith: function( context, args ) {
    				if ( !locked ) {
    					args = args || [];
    					args = [ context, args.slice ? args.slice() : args ];
    					queue.push( args );
    					if ( !firing ) {
    						fire();
    					}
    				}
    				return this;
    			},

    			// Call all the callbacks with the given arguments
    			fire: function() {
    				self.fireWith( this, arguments );
    				return this;
    			},

    			// To know if the callbacks have already been called at least once
    			fired: function() {
    				return !!fired;
    			}
    		};

    	return self;
    };


    function Identity( v ) {
    	return v;
    }
    function Thrower( ex ) {
    	throw ex;
    }

    function adoptValue( value, resolve, reject, noValue ) {
    	var method;

    	try {

    		// Check for promise aspect first to privilege synchronous behavior
    		if ( value && isFunction( ( method = value.promise ) ) ) {
    			method.call( value ).done( resolve ).fail( reject );

    		// Other thenables
    		} else if ( value && isFunction( ( method = value.then ) ) ) {
    			method.call( value, resolve, reject );

    		// Other non-thenables
    		} else {

    			// Control `resolve` arguments by letting Array#slice cast boolean `noValue` to integer:
    			// * false: [ value ].slice( 0 ) => resolve( value )
    			// * true: [ value ].slice( 1 ) => resolve()
    			resolve.apply( undefined, [ value ].slice( noValue ) );
    		}

    	// For Promises/A+, convert exceptions into rejections
    	// Since jQuery.when doesn't unwrap thenables, we can skip the extra checks appearing in
    	// Deferred#then to conditionally suppress rejection.
    	} catch ( value ) {

    		// Support: Android 4.0 only
    		// Strict mode functions invoked without .call/.apply get global-object context
    		reject.apply( undefined, [ value ] );
    	}
    }

    jQuery.extend( {

    	Deferred: function( func ) {
    		var tuples = [

    				// action, add listener, callbacks,
    				// ... .then handlers, argument index, [final state]
    				[ "notify", "progress", jQuery.Callbacks( "memory" ),
    					jQuery.Callbacks( "memory" ), 2 ],
    				[ "resolve", "done", jQuery.Callbacks( "once memory" ),
    					jQuery.Callbacks( "once memory" ), 0, "resolved" ],
    				[ "reject", "fail", jQuery.Callbacks( "once memory" ),
    					jQuery.Callbacks( "once memory" ), 1, "rejected" ]
    			],
    			state = "pending",
    			promise = {
    				state: function() {
    					return state;
    				},
    				always: function() {
    					deferred.done( arguments ).fail( arguments );
    					return this;
    				},
    				"catch": function( fn ) {
    					return promise.then( null, fn );
    				},

    				// Keep pipe for back-compat
    				pipe: function( /* fnDone, fnFail, fnProgress */ ) {
    					var fns = arguments;

    					return jQuery.Deferred( function( newDefer ) {
    						jQuery.each( tuples, function( _i, tuple ) {

    							// Map tuples (progress, done, fail) to arguments (done, fail, progress)
    							var fn = isFunction( fns[ tuple[ 4 ] ] ) && fns[ tuple[ 4 ] ];

    							// deferred.progress(function() { bind to newDefer or newDefer.notify })
    							// deferred.done(function() { bind to newDefer or newDefer.resolve })
    							// deferred.fail(function() { bind to newDefer or newDefer.reject })
    							deferred[ tuple[ 1 ] ]( function() {
    								var returned = fn && fn.apply( this, arguments );
    								if ( returned && isFunction( returned.promise ) ) {
    									returned.promise()
    										.progress( newDefer.notify )
    										.done( newDefer.resolve )
    										.fail( newDefer.reject );
    								} else {
    									newDefer[ tuple[ 0 ] + "With" ](
    										this,
    										fn ? [ returned ] : arguments
    									);
    								}
    							} );
    						} );
    						fns = null;
    					} ).promise();
    				},
    				then: function( onFulfilled, onRejected, onProgress ) {
    					var maxDepth = 0;
    					function resolve( depth, deferred, handler, special ) {
    						return function() {
    							var that = this,
    								args = arguments,
    								mightThrow = function() {
    									var returned, then;

    									// Support: Promises/A+ section 2.3.3.3.3
    									// https://promisesaplus.com/#point-59
    									// Ignore double-resolution attempts
    									if ( depth < maxDepth ) {
    										return;
    									}

    									returned = handler.apply( that, args );

    									// Support: Promises/A+ section 2.3.1
    									// https://promisesaplus.com/#point-48
    									if ( returned === deferred.promise() ) {
    										throw new TypeError( "Thenable self-resolution" );
    									}

    									// Support: Promises/A+ sections 2.3.3.1, 3.5
    									// https://promisesaplus.com/#point-54
    									// https://promisesaplus.com/#point-75
    									// Retrieve `then` only once
    									then = returned &&

    										// Support: Promises/A+ section 2.3.4
    										// https://promisesaplus.com/#point-64
    										// Only check objects and functions for thenability
    										( typeof returned === "object" ||
    											typeof returned === "function" ) &&
    										returned.then;

    									// Handle a returned thenable
    									if ( isFunction( then ) ) {

    										// Special processors (notify) just wait for resolution
    										if ( special ) {
    											then.call(
    												returned,
    												resolve( maxDepth, deferred, Identity, special ),
    												resolve( maxDepth, deferred, Thrower, special )
    											);

    										// Normal processors (resolve) also hook into progress
    										} else {

    											// ...and disregard older resolution values
    											maxDepth++;

    											then.call(
    												returned,
    												resolve( maxDepth, deferred, Identity, special ),
    												resolve( maxDepth, deferred, Thrower, special ),
    												resolve( maxDepth, deferred, Identity,
    													deferred.notifyWith )
    											);
    										}

    									// Handle all other returned values
    									} else {

    										// Only substitute handlers pass on context
    										// and multiple values (non-spec behavior)
    										if ( handler !== Identity ) {
    											that = undefined;
    											args = [ returned ];
    										}

    										// Process the value(s)
    										// Default process is resolve
    										( special || deferred.resolveWith )( that, args );
    									}
    								},

    								// Only normal processors (resolve) catch and reject exceptions
    								process = special ?
    									mightThrow :
    									function() {
    										try {
    											mightThrow();
    										} catch ( e ) {

    											if ( jQuery.Deferred.exceptionHook ) {
    												jQuery.Deferred.exceptionHook( e,
    													process.stackTrace );
    											}

    											// Support: Promises/A+ section 2.3.3.3.4.1
    											// https://promisesaplus.com/#point-61
    											// Ignore post-resolution exceptions
    											if ( depth + 1 >= maxDepth ) {

    												// Only substitute handlers pass on context
    												// and multiple values (non-spec behavior)
    												if ( handler !== Thrower ) {
    													that = undefined;
    													args = [ e ];
    												}

    												deferred.rejectWith( that, args );
    											}
    										}
    									};

    							// Support: Promises/A+ section 2.3.3.3.1
    							// https://promisesaplus.com/#point-57
    							// Re-resolve promises immediately to dodge false rejection from
    							// subsequent errors
    							if ( depth ) {
    								process();
    							} else {

    								// Call an optional hook to record the stack, in case of exception
    								// since it's otherwise lost when execution goes async
    								if ( jQuery.Deferred.getStackHook ) {
    									process.stackTrace = jQuery.Deferred.getStackHook();
    								}
    								window.setTimeout( process );
    							}
    						};
    					}

    					return jQuery.Deferred( function( newDefer ) {

    						// progress_handlers.add( ... )
    						tuples[ 0 ][ 3 ].add(
    							resolve(
    								0,
    								newDefer,
    								isFunction( onProgress ) ?
    									onProgress :
    									Identity,
    								newDefer.notifyWith
    							)
    						);

    						// fulfilled_handlers.add( ... )
    						tuples[ 1 ][ 3 ].add(
    							resolve(
    								0,
    								newDefer,
    								isFunction( onFulfilled ) ?
    									onFulfilled :
    									Identity
    							)
    						);

    						// rejected_handlers.add( ... )
    						tuples[ 2 ][ 3 ].add(
    							resolve(
    								0,
    								newDefer,
    								isFunction( onRejected ) ?
    									onRejected :
    									Thrower
    							)
    						);
    					} ).promise();
    				},

    				// Get a promise for this deferred
    				// If obj is provided, the promise aspect is added to the object
    				promise: function( obj ) {
    					return obj != null ? jQuery.extend( obj, promise ) : promise;
    				}
    			},
    			deferred = {};

    		// Add list-specific methods
    		jQuery.each( tuples, function( i, tuple ) {
    			var list = tuple[ 2 ],
    				stateString = tuple[ 5 ];

    			// promise.progress = list.add
    			// promise.done = list.add
    			// promise.fail = list.add
    			promise[ tuple[ 1 ] ] = list.add;

    			// Handle state
    			if ( stateString ) {
    				list.add(
    					function() {

    						// state = "resolved" (i.e., fulfilled)
    						// state = "rejected"
    						state = stateString;
    					},

    					// rejected_callbacks.disable
    					// fulfilled_callbacks.disable
    					tuples[ 3 - i ][ 2 ].disable,

    					// rejected_handlers.disable
    					// fulfilled_handlers.disable
    					tuples[ 3 - i ][ 3 ].disable,

    					// progress_callbacks.lock
    					tuples[ 0 ][ 2 ].lock,

    					// progress_handlers.lock
    					tuples[ 0 ][ 3 ].lock
    				);
    			}

    			// progress_handlers.fire
    			// fulfilled_handlers.fire
    			// rejected_handlers.fire
    			list.add( tuple[ 3 ].fire );

    			// deferred.notify = function() { deferred.notifyWith(...) }
    			// deferred.resolve = function() { deferred.resolveWith(...) }
    			// deferred.reject = function() { deferred.rejectWith(...) }
    			deferred[ tuple[ 0 ] ] = function() {
    				deferred[ tuple[ 0 ] + "With" ]( this === deferred ? undefined : this, arguments );
    				return this;
    			};

    			// deferred.notifyWith = list.fireWith
    			// deferred.resolveWith = list.fireWith
    			// deferred.rejectWith = list.fireWith
    			deferred[ tuple[ 0 ] + "With" ] = list.fireWith;
    		} );

    		// Make the deferred a promise
    		promise.promise( deferred );

    		// Call given func if any
    		if ( func ) {
    			func.call( deferred, deferred );
    		}

    		// All done!
    		return deferred;
    	},

    	// Deferred helper
    	when: function( singleValue ) {
    		var

    			// count of uncompleted subordinates
    			remaining = arguments.length,

    			// count of unprocessed arguments
    			i = remaining,

    			// subordinate fulfillment data
    			resolveContexts = Array( i ),
    			resolveValues = slice.call( arguments ),

    			// the primary Deferred
    			primary = jQuery.Deferred(),

    			// subordinate callback factory
    			updateFunc = function( i ) {
    				return function( value ) {
    					resolveContexts[ i ] = this;
    					resolveValues[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
    					if ( !( --remaining ) ) {
    						primary.resolveWith( resolveContexts, resolveValues );
    					}
    				};
    			};

    		// Single- and empty arguments are adopted like Promise.resolve
    		if ( remaining <= 1 ) {
    			adoptValue( singleValue, primary.done( updateFunc( i ) ).resolve, primary.reject,
    				!remaining );

    			// Use .then() to unwrap secondary thenables (cf. gh-3000)
    			if ( primary.state() === "pending" ||
    				isFunction( resolveValues[ i ] && resolveValues[ i ].then ) ) {

    				return primary.then();
    			}
    		}

    		// Multiple arguments are aggregated like Promise.all array elements
    		while ( i-- ) {
    			adoptValue( resolveValues[ i ], updateFunc( i ), primary.reject );
    		}

    		return primary.promise();
    	}
    } );


    // These usually indicate a programmer mistake during development,
    // warn about them ASAP rather than swallowing them by default.
    var rerrorNames = /^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;

    jQuery.Deferred.exceptionHook = function( error, stack ) {

    	// Support: IE 8 - 9 only
    	// Console exists when dev tools are open, which can happen at any time
    	if ( window.console && window.console.warn && error && rerrorNames.test( error.name ) ) {
    		window.console.warn( "jQuery.Deferred exception: " + error.message, error.stack, stack );
    	}
    };




    jQuery.readyException = function( error ) {
    	window.setTimeout( function() {
    		throw error;
    	} );
    };




    // The deferred used on DOM ready
    var readyList = jQuery.Deferred();

    jQuery.fn.ready = function( fn ) {

    	readyList
    		.then( fn )

    		// Wrap jQuery.readyException in a function so that the lookup
    		// happens at the time of error handling instead of callback
    		// registration.
    		.catch( function( error ) {
    			jQuery.readyException( error );
    		} );

    	return this;
    };

    jQuery.extend( {

    	// Is the DOM ready to be used? Set to true once it occurs.
    	isReady: false,

    	// A counter to track how many items to wait for before
    	// the ready event fires. See #6781
    	readyWait: 1,

    	// Handle when the DOM is ready
    	ready: function( wait ) {

    		// Abort if there are pending holds or we're already ready
    		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
    			return;
    		}

    		// Remember that the DOM is ready
    		jQuery.isReady = true;

    		// If a normal DOM Ready event fired, decrement, and wait if need be
    		if ( wait !== true && --jQuery.readyWait > 0 ) {
    			return;
    		}

    		// If there are functions bound, to execute
    		readyList.resolveWith( document, [ jQuery ] );
    	}
    } );

    jQuery.ready.then = readyList.then;

    // The ready event handler and self cleanup method
    function completed() {
    	document.removeEventListener( "DOMContentLoaded", completed );
    	window.removeEventListener( "load", completed );
    	jQuery.ready();
    }

    // Catch cases where $(document).ready() is called
    // after the browser event has already occurred.
    // Support: IE <=9 - 10 only
    // Older IE sometimes signals "interactive" too soon
    if ( document.readyState === "complete" ||
    	( document.readyState !== "loading" && !document.documentElement.doScroll ) ) {

    	// Handle it asynchronously to allow scripts the opportunity to delay ready
    	window.setTimeout( jQuery.ready );

    } else {

    	// Use the handy event callback
    	document.addEventListener( "DOMContentLoaded", completed );

    	// A fallback to window.onload, that will always work
    	window.addEventListener( "load", completed );
    }




    // Multifunctional method to get and set values of a collection
    // The value/s can optionally be executed if it's a function
    var access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
    	var i = 0,
    		len = elems.length,
    		bulk = key == null;

    	// Sets many values
    	if ( toType( key ) === "object" ) {
    		chainable = true;
    		for ( i in key ) {
    			access( elems, fn, i, key[ i ], true, emptyGet, raw );
    		}

    	// Sets one value
    	} else if ( value !== undefined ) {
    		chainable = true;

    		if ( !isFunction( value ) ) {
    			raw = true;
    		}

    		if ( bulk ) {

    			// Bulk operations run against the entire set
    			if ( raw ) {
    				fn.call( elems, value );
    				fn = null;

    			// ...except when executing function values
    			} else {
    				bulk = fn;
    				fn = function( elem, _key, value ) {
    					return bulk.call( jQuery( elem ), value );
    				};
    			}
    		}

    		if ( fn ) {
    			for ( ; i < len; i++ ) {
    				fn(
    					elems[ i ], key, raw ?
    						value :
    						value.call( elems[ i ], i, fn( elems[ i ], key ) )
    				);
    			}
    		}
    	}

    	if ( chainable ) {
    		return elems;
    	}

    	// Gets
    	if ( bulk ) {
    		return fn.call( elems );
    	}

    	return len ? fn( elems[ 0 ], key ) : emptyGet;
    };


    // Matches dashed string for camelizing
    var rmsPrefix = /^-ms-/,
    	rdashAlpha = /-([a-z])/g;

    // Used by camelCase as callback to replace()
    function fcamelCase( _all, letter ) {
    	return letter.toUpperCase();
    }

    // Convert dashed to camelCase; used by the css and data modules
    // Support: IE <=9 - 11, Edge 12 - 15
    // Microsoft forgot to hump their vendor prefix (#9572)
    function camelCase( string ) {
    	return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
    }
    var acceptData = function( owner ) {

    	// Accepts only:
    	//  - Node
    	//    - Node.ELEMENT_NODE
    	//    - Node.DOCUMENT_NODE
    	//  - Object
    	//    - Any
    	return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
    };




    function Data() {
    	this.expando = jQuery.expando + Data.uid++;
    }

    Data.uid = 1;

    Data.prototype = {

    	cache: function( owner ) {

    		// Check if the owner object already has a cache
    		var value = owner[ this.expando ];

    		// If not, create one
    		if ( !value ) {
    			value = {};

    			// We can accept data for non-element nodes in modern browsers,
    			// but we should not, see #8335.
    			// Always return an empty object.
    			if ( acceptData( owner ) ) {

    				// If it is a node unlikely to be stringify-ed or looped over
    				// use plain assignment
    				if ( owner.nodeType ) {
    					owner[ this.expando ] = value;

    				// Otherwise secure it in a non-enumerable property
    				// configurable must be true to allow the property to be
    				// deleted when data is removed
    				} else {
    					Object.defineProperty( owner, this.expando, {
    						value: value,
    						configurable: true
    					} );
    				}
    			}
    		}

    		return value;
    	},
    	set: function( owner, data, value ) {
    		var prop,
    			cache = this.cache( owner );

    		// Handle: [ owner, key, value ] args
    		// Always use camelCase key (gh-2257)
    		if ( typeof data === "string" ) {
    			cache[ camelCase( data ) ] = value;

    		// Handle: [ owner, { properties } ] args
    		} else {

    			// Copy the properties one-by-one to the cache object
    			for ( prop in data ) {
    				cache[ camelCase( prop ) ] = data[ prop ];
    			}
    		}
    		return cache;
    	},
    	get: function( owner, key ) {
    		return key === undefined ?
    			this.cache( owner ) :

    			// Always use camelCase key (gh-2257)
    			owner[ this.expando ] && owner[ this.expando ][ camelCase( key ) ];
    	},
    	access: function( owner, key, value ) {

    		// In cases where either:
    		//
    		//   1. No key was specified
    		//   2. A string key was specified, but no value provided
    		//
    		// Take the "read" path and allow the get method to determine
    		// which value to return, respectively either:
    		//
    		//   1. The entire cache object
    		//   2. The data stored at the key
    		//
    		if ( key === undefined ||
    				( ( key && typeof key === "string" ) && value === undefined ) ) {

    			return this.get( owner, key );
    		}

    		// When the key is not a string, or both a key and value
    		// are specified, set or extend (existing objects) with either:
    		//
    		//   1. An object of properties
    		//   2. A key and value
    		//
    		this.set( owner, key, value );

    		// Since the "set" path can have two possible entry points
    		// return the expected data based on which path was taken[*]
    		return value !== undefined ? value : key;
    	},
    	remove: function( owner, key ) {
    		var i,
    			cache = owner[ this.expando ];

    		if ( cache === undefined ) {
    			return;
    		}

    		if ( key !== undefined ) {

    			// Support array or space separated string of keys
    			if ( Array.isArray( key ) ) {

    				// If key is an array of keys...
    				// We always set camelCase keys, so remove that.
    				key = key.map( camelCase );
    			} else {
    				key = camelCase( key );

    				// If a key with the spaces exists, use it.
    				// Otherwise, create an array by matching non-whitespace
    				key = key in cache ?
    					[ key ] :
    					( key.match( rnothtmlwhite ) || [] );
    			}

    			i = key.length;

    			while ( i-- ) {
    				delete cache[ key[ i ] ];
    			}
    		}

    		// Remove the expando if there's no more data
    		if ( key === undefined || jQuery.isEmptyObject( cache ) ) {

    			// Support: Chrome <=35 - 45
    			// Webkit & Blink performance suffers when deleting properties
    			// from DOM nodes, so set to undefined instead
    			// https://bugs.chromium.org/p/chromium/issues/detail?id=378607 (bug restricted)
    			if ( owner.nodeType ) {
    				owner[ this.expando ] = undefined;
    			} else {
    				delete owner[ this.expando ];
    			}
    		}
    	},
    	hasData: function( owner ) {
    		var cache = owner[ this.expando ];
    		return cache !== undefined && !jQuery.isEmptyObject( cache );
    	}
    };
    var dataPriv = new Data();

    var dataUser = new Data();



    //	Implementation Summary
    //
    //	1. Enforce API surface and semantic compatibility with 1.9.x branch
    //	2. Improve the module's maintainability by reducing the storage
    //		paths to a single mechanism.
    //	3. Use the same single mechanism to support "private" and "user" data.
    //	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
    //	5. Avoid exposing implementation details on user objects (eg. expando properties)
    //	6. Provide a clear path for implementation upgrade to WeakMap in 2014

    var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
    	rmultiDash = /[A-Z]/g;

    function getData( data ) {
    	if ( data === "true" ) {
    		return true;
    	}

    	if ( data === "false" ) {
    		return false;
    	}

    	if ( data === "null" ) {
    		return null;
    	}

    	// Only convert to a number if it doesn't change the string
    	if ( data === +data + "" ) {
    		return +data;
    	}

    	if ( rbrace.test( data ) ) {
    		return JSON.parse( data );
    	}

    	return data;
    }

    function dataAttr( elem, key, data ) {
    	var name;

    	// If nothing was found internally, try to fetch any
    	// data from the HTML5 data-* attribute
    	if ( data === undefined && elem.nodeType === 1 ) {
    		name = "data-" + key.replace( rmultiDash, "-$&" ).toLowerCase();
    		data = elem.getAttribute( name );

    		if ( typeof data === "string" ) {
    			try {
    				data = getData( data );
    			} catch ( e ) {}

    			// Make sure we set the data so it isn't changed later
    			dataUser.set( elem, key, data );
    		} else {
    			data = undefined;
    		}
    	}
    	return data;
    }

    jQuery.extend( {
    	hasData: function( elem ) {
    		return dataUser.hasData( elem ) || dataPriv.hasData( elem );
    	},

    	data: function( elem, name, data ) {
    		return dataUser.access( elem, name, data );
    	},

    	removeData: function( elem, name ) {
    		dataUser.remove( elem, name );
    	},

    	// TODO: Now that all calls to _data and _removeData have been replaced
    	// with direct calls to dataPriv methods, these can be deprecated.
    	_data: function( elem, name, data ) {
    		return dataPriv.access( elem, name, data );
    	},

    	_removeData: function( elem, name ) {
    		dataPriv.remove( elem, name );
    	}
    } );

    jQuery.fn.extend( {
    	data: function( key, value ) {
    		var i, name, data,
    			elem = this[ 0 ],
    			attrs = elem && elem.attributes;

    		// Gets all values
    		if ( key === undefined ) {
    			if ( this.length ) {
    				data = dataUser.get( elem );

    				if ( elem.nodeType === 1 && !dataPriv.get( elem, "hasDataAttrs" ) ) {
    					i = attrs.length;
    					while ( i-- ) {

    						// Support: IE 11 only
    						// The attrs elements can be null (#14894)
    						if ( attrs[ i ] ) {
    							name = attrs[ i ].name;
    							if ( name.indexOf( "data-" ) === 0 ) {
    								name = camelCase( name.slice( 5 ) );
    								dataAttr( elem, name, data[ name ] );
    							}
    						}
    					}
    					dataPriv.set( elem, "hasDataAttrs", true );
    				}
    			}

    			return data;
    		}

    		// Sets multiple values
    		if ( typeof key === "object" ) {
    			return this.each( function() {
    				dataUser.set( this, key );
    			} );
    		}

    		return access( this, function( value ) {
    			var data;

    			// The calling jQuery object (element matches) is not empty
    			// (and therefore has an element appears at this[ 0 ]) and the
    			// `value` parameter was not undefined. An empty jQuery object
    			// will result in `undefined` for elem = this[ 0 ] which will
    			// throw an exception if an attempt to read a data cache is made.
    			if ( elem && value === undefined ) {

    				// Attempt to get data from the cache
    				// The key will always be camelCased in Data
    				data = dataUser.get( elem, key );
    				if ( data !== undefined ) {
    					return data;
    				}

    				// Attempt to "discover" the data in
    				// HTML5 custom data-* attrs
    				data = dataAttr( elem, key );
    				if ( data !== undefined ) {
    					return data;
    				}

    				// We tried really hard, but the data doesn't exist.
    				return;
    			}

    			// Set the data...
    			this.each( function() {

    				// We always store the camelCased key
    				dataUser.set( this, key, value );
    			} );
    		}, null, value, arguments.length > 1, null, true );
    	},

    	removeData: function( key ) {
    		return this.each( function() {
    			dataUser.remove( this, key );
    		} );
    	}
    } );


    jQuery.extend( {
    	queue: function( elem, type, data ) {
    		var queue;

    		if ( elem ) {
    			type = ( type || "fx" ) + "queue";
    			queue = dataPriv.get( elem, type );

    			// Speed up dequeue by getting out quickly if this is just a lookup
    			if ( data ) {
    				if ( !queue || Array.isArray( data ) ) {
    					queue = dataPriv.access( elem, type, jQuery.makeArray( data ) );
    				} else {
    					queue.push( data );
    				}
    			}
    			return queue || [];
    		}
    	},

    	dequeue: function( elem, type ) {
    		type = type || "fx";

    		var queue = jQuery.queue( elem, type ),
    			startLength = queue.length,
    			fn = queue.shift(),
    			hooks = jQuery._queueHooks( elem, type ),
    			next = function() {
    				jQuery.dequeue( elem, type );
    			};

    		// If the fx queue is dequeued, always remove the progress sentinel
    		if ( fn === "inprogress" ) {
    			fn = queue.shift();
    			startLength--;
    		}

    		if ( fn ) {

    			// Add a progress sentinel to prevent the fx queue from being
    			// automatically dequeued
    			if ( type === "fx" ) {
    				queue.unshift( "inprogress" );
    			}

    			// Clear up the last queue stop function
    			delete hooks.stop;
    			fn.call( elem, next, hooks );
    		}

    		if ( !startLength && hooks ) {
    			hooks.empty.fire();
    		}
    	},

    	// Not public - generate a queueHooks object, or return the current one
    	_queueHooks: function( elem, type ) {
    		var key = type + "queueHooks";
    		return dataPriv.get( elem, key ) || dataPriv.access( elem, key, {
    			empty: jQuery.Callbacks( "once memory" ).add( function() {
    				dataPriv.remove( elem, [ type + "queue", key ] );
    			} )
    		} );
    	}
    } );

    jQuery.fn.extend( {
    	queue: function( type, data ) {
    		var setter = 2;

    		if ( typeof type !== "string" ) {
    			data = type;
    			type = "fx";
    			setter--;
    		}

    		if ( arguments.length < setter ) {
    			return jQuery.queue( this[ 0 ], type );
    		}

    		return data === undefined ?
    			this :
    			this.each( function() {
    				var queue = jQuery.queue( this, type, data );

    				// Ensure a hooks for this queue
    				jQuery._queueHooks( this, type );

    				if ( type === "fx" && queue[ 0 ] !== "inprogress" ) {
    					jQuery.dequeue( this, type );
    				}
    			} );
    	},
    	dequeue: function( type ) {
    		return this.each( function() {
    			jQuery.dequeue( this, type );
    		} );
    	},
    	clearQueue: function( type ) {
    		return this.queue( type || "fx", [] );
    	},

    	// Get a promise resolved when queues of a certain type
    	// are emptied (fx is the type by default)
    	promise: function( type, obj ) {
    		var tmp,
    			count = 1,
    			defer = jQuery.Deferred(),
    			elements = this,
    			i = this.length,
    			resolve = function() {
    				if ( !( --count ) ) {
    					defer.resolveWith( elements, [ elements ] );
    				}
    			};

    		if ( typeof type !== "string" ) {
    			obj = type;
    			type = undefined;
    		}
    		type = type || "fx";

    		while ( i-- ) {
    			tmp = dataPriv.get( elements[ i ], type + "queueHooks" );
    			if ( tmp && tmp.empty ) {
    				count++;
    				tmp.empty.add( resolve );
    			}
    		}
    		resolve();
    		return defer.promise( obj );
    	}
    } );
    var pnum = ( /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/ ).source;

    var rcssNum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" );


    var cssExpand = [ "Top", "Right", "Bottom", "Left" ];

    var documentElement = document.documentElement;



    	var isAttached = function( elem ) {
    			return jQuery.contains( elem.ownerDocument, elem );
    		},
    		composed = { composed: true };

    	// Support: IE 9 - 11+, Edge 12 - 18+, iOS 10.0 - 10.2 only
    	// Check attachment across shadow DOM boundaries when possible (gh-3504)
    	// Support: iOS 10.0-10.2 only
    	// Early iOS 10 versions support `attachShadow` but not `getRootNode`,
    	// leading to errors. We need to check for `getRootNode`.
    	if ( documentElement.getRootNode ) {
    		isAttached = function( elem ) {
    			return jQuery.contains( elem.ownerDocument, elem ) ||
    				elem.getRootNode( composed ) === elem.ownerDocument;
    		};
    	}
    var isHiddenWithinTree = function( elem, el ) {

    		// isHiddenWithinTree might be called from jQuery#filter function;
    		// in that case, element will be second argument
    		elem = el || elem;

    		// Inline style trumps all
    		return elem.style.display === "none" ||
    			elem.style.display === "" &&

    			// Otherwise, check computed style
    			// Support: Firefox <=43 - 45
    			// Disconnected elements can have computed display: none, so first confirm that elem is
    			// in the document.
    			isAttached( elem ) &&

    			jQuery.css( elem, "display" ) === "none";
    	};



    function adjustCSS( elem, prop, valueParts, tween ) {
    	var adjusted, scale,
    		maxIterations = 20,
    		currentValue = tween ?
    			function() {
    				return tween.cur();
    			} :
    			function() {
    				return jQuery.css( elem, prop, "" );
    			},
    		initial = currentValue(),
    		unit = valueParts && valueParts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

    		// Starting value computation is required for potential unit mismatches
    		initialInUnit = elem.nodeType &&
    			( jQuery.cssNumber[ prop ] || unit !== "px" && +initial ) &&
    			rcssNum.exec( jQuery.css( elem, prop ) );

    	if ( initialInUnit && initialInUnit[ 3 ] !== unit ) {

    		// Support: Firefox <=54
    		// Halve the iteration target value to prevent interference from CSS upper bounds (gh-2144)
    		initial = initial / 2;

    		// Trust units reported by jQuery.css
    		unit = unit || initialInUnit[ 3 ];

    		// Iteratively approximate from a nonzero starting point
    		initialInUnit = +initial || 1;

    		while ( maxIterations-- ) {

    			// Evaluate and update our best guess (doubling guesses that zero out).
    			// Finish if the scale equals or crosses 1 (making the old*new product non-positive).
    			jQuery.style( elem, prop, initialInUnit + unit );
    			if ( ( 1 - scale ) * ( 1 - ( scale = currentValue() / initial || 0.5 ) ) <= 0 ) {
    				maxIterations = 0;
    			}
    			initialInUnit = initialInUnit / scale;

    		}

    		initialInUnit = initialInUnit * 2;
    		jQuery.style( elem, prop, initialInUnit + unit );

    		// Make sure we update the tween properties later on
    		valueParts = valueParts || [];
    	}

    	if ( valueParts ) {
    		initialInUnit = +initialInUnit || +initial || 0;

    		// Apply relative offset (+=/-=) if specified
    		adjusted = valueParts[ 1 ] ?
    			initialInUnit + ( valueParts[ 1 ] + 1 ) * valueParts[ 2 ] :
    			+valueParts[ 2 ];
    		if ( tween ) {
    			tween.unit = unit;
    			tween.start = initialInUnit;
    			tween.end = adjusted;
    		}
    	}
    	return adjusted;
    }


    var defaultDisplayMap = {};

    function getDefaultDisplay( elem ) {
    	var temp,
    		doc = elem.ownerDocument,
    		nodeName = elem.nodeName,
    		display = defaultDisplayMap[ nodeName ];

    	if ( display ) {
    		return display;
    	}

    	temp = doc.body.appendChild( doc.createElement( nodeName ) );
    	display = jQuery.css( temp, "display" );

    	temp.parentNode.removeChild( temp );

    	if ( display === "none" ) {
    		display = "block";
    	}
    	defaultDisplayMap[ nodeName ] = display;

    	return display;
    }

    function showHide( elements, show ) {
    	var display, elem,
    		values = [],
    		index = 0,
    		length = elements.length;

    	// Determine new display value for elements that need to change
    	for ( ; index < length; index++ ) {
    		elem = elements[ index ];
    		if ( !elem.style ) {
    			continue;
    		}

    		display = elem.style.display;
    		if ( show ) {

    			// Since we force visibility upon cascade-hidden elements, an immediate (and slow)
    			// check is required in this first loop unless we have a nonempty display value (either
    			// inline or about-to-be-restored)
    			if ( display === "none" ) {
    				values[ index ] = dataPriv.get( elem, "display" ) || null;
    				if ( !values[ index ] ) {
    					elem.style.display = "";
    				}
    			}
    			if ( elem.style.display === "" && isHiddenWithinTree( elem ) ) {
    				values[ index ] = getDefaultDisplay( elem );
    			}
    		} else {
    			if ( display !== "none" ) {
    				values[ index ] = "none";

    				// Remember what we're overwriting
    				dataPriv.set( elem, "display", display );
    			}
    		}
    	}

    	// Set the display of the elements in a second loop to avoid constant reflow
    	for ( index = 0; index < length; index++ ) {
    		if ( values[ index ] != null ) {
    			elements[ index ].style.display = values[ index ];
    		}
    	}

    	return elements;
    }

    jQuery.fn.extend( {
    	show: function() {
    		return showHide( this, true );
    	},
    	hide: function() {
    		return showHide( this );
    	},
    	toggle: function( state ) {
    		if ( typeof state === "boolean" ) {
    			return state ? this.show() : this.hide();
    		}

    		return this.each( function() {
    			if ( isHiddenWithinTree( this ) ) {
    				jQuery( this ).show();
    			} else {
    				jQuery( this ).hide();
    			}
    		} );
    	}
    } );
    var rcheckableType = ( /^(?:checkbox|radio)$/i );

    var rtagName = ( /<([a-z][^\/\0>\x20\t\r\n\f]*)/i );

    var rscriptType = ( /^$|^module$|\/(?:java|ecma)script/i );



    ( function() {
    	var fragment = document.createDocumentFragment(),
    		div = fragment.appendChild( document.createElement( "div" ) ),
    		input = document.createElement( "input" );

    	// Support: Android 4.0 - 4.3 only
    	// Check state lost if the name is set (#11217)
    	// Support: Windows Web Apps (WWA)
    	// `name` and `type` must use .setAttribute for WWA (#14901)
    	input.setAttribute( "type", "radio" );
    	input.setAttribute( "checked", "checked" );
    	input.setAttribute( "name", "t" );

    	div.appendChild( input );

    	// Support: Android <=4.1 only
    	// Older WebKit doesn't clone checked state correctly in fragments
    	support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

    	// Support: IE <=11 only
    	// Make sure textarea (and checkbox) defaultValue is properly cloned
    	div.innerHTML = "<textarea>x</textarea>";
    	support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;

    	// Support: IE <=9 only
    	// IE <=9 replaces <option> tags with their contents when inserted outside of
    	// the select element.
    	div.innerHTML = "<option></option>";
    	support.option = !!div.lastChild;
    } )();


    // We have to close these tags to support XHTML (#13200)
    var wrapMap = {

    	// XHTML parsers do not magically insert elements in the
    	// same way that tag soup parsers do. So we cannot shorten
    	// this by omitting <tbody> or other required elements.
    	thead: [ 1, "<table>", "</table>" ],
    	col: [ 2, "<table><colgroup>", "</colgroup></table>" ],
    	tr: [ 2, "<table><tbody>", "</tbody></table>" ],
    	td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

    	_default: [ 0, "", "" ]
    };

    wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
    wrapMap.th = wrapMap.td;

    // Support: IE <=9 only
    if ( !support.option ) {
    	wrapMap.optgroup = wrapMap.option = [ 1, "<select multiple='multiple'>", "</select>" ];
    }


    function getAll( context, tag ) {

    	// Support: IE <=9 - 11 only
    	// Use typeof to avoid zero-argument method invocation on host objects (#15151)
    	var ret;

    	if ( typeof context.getElementsByTagName !== "undefined" ) {
    		ret = context.getElementsByTagName( tag || "*" );

    	} else if ( typeof context.querySelectorAll !== "undefined" ) {
    		ret = context.querySelectorAll( tag || "*" );

    	} else {
    		ret = [];
    	}

    	if ( tag === undefined || tag && nodeName( context, tag ) ) {
    		return jQuery.merge( [ context ], ret );
    	}

    	return ret;
    }


    // Mark scripts as having already been evaluated
    function setGlobalEval( elems, refElements ) {
    	var i = 0,
    		l = elems.length;

    	for ( ; i < l; i++ ) {
    		dataPriv.set(
    			elems[ i ],
    			"globalEval",
    			!refElements || dataPriv.get( refElements[ i ], "globalEval" )
    		);
    	}
    }


    var rhtml = /<|&#?\w+;/;

    function buildFragment( elems, context, scripts, selection, ignored ) {
    	var elem, tmp, tag, wrap, attached, j,
    		fragment = context.createDocumentFragment(),
    		nodes = [],
    		i = 0,
    		l = elems.length;

    	for ( ; i < l; i++ ) {
    		elem = elems[ i ];

    		if ( elem || elem === 0 ) {

    			// Add nodes directly
    			if ( toType( elem ) === "object" ) {

    				// Support: Android <=4.0 only, PhantomJS 1 only
    				// push.apply(_, arraylike) throws on ancient WebKit
    				jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

    			// Convert non-html into a text node
    			} else if ( !rhtml.test( elem ) ) {
    				nodes.push( context.createTextNode( elem ) );

    			// Convert html into DOM nodes
    			} else {
    				tmp = tmp || fragment.appendChild( context.createElement( "div" ) );

    				// Deserialize a standard representation
    				tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
    				wrap = wrapMap[ tag ] || wrapMap._default;
    				tmp.innerHTML = wrap[ 1 ] + jQuery.htmlPrefilter( elem ) + wrap[ 2 ];

    				// Descend through wrappers to the right content
    				j = wrap[ 0 ];
    				while ( j-- ) {
    					tmp = tmp.lastChild;
    				}

    				// Support: Android <=4.0 only, PhantomJS 1 only
    				// push.apply(_, arraylike) throws on ancient WebKit
    				jQuery.merge( nodes, tmp.childNodes );

    				// Remember the top-level container
    				tmp = fragment.firstChild;

    				// Ensure the created nodes are orphaned (#12392)
    				tmp.textContent = "";
    			}
    		}
    	}

    	// Remove wrapper from fragment
    	fragment.textContent = "";

    	i = 0;
    	while ( ( elem = nodes[ i++ ] ) ) {

    		// Skip elements already in the context collection (trac-4087)
    		if ( selection && jQuery.inArray( elem, selection ) > -1 ) {
    			if ( ignored ) {
    				ignored.push( elem );
    			}
    			continue;
    		}

    		attached = isAttached( elem );

    		// Append to fragment
    		tmp = getAll( fragment.appendChild( elem ), "script" );

    		// Preserve script evaluation history
    		if ( attached ) {
    			setGlobalEval( tmp );
    		}

    		// Capture executables
    		if ( scripts ) {
    			j = 0;
    			while ( ( elem = tmp[ j++ ] ) ) {
    				if ( rscriptType.test( elem.type || "" ) ) {
    					scripts.push( elem );
    				}
    			}
    		}
    	}

    	return fragment;
    }


    var rtypenamespace = /^([^.]*)(?:\.(.+)|)/;

    function returnTrue() {
    	return true;
    }

    function returnFalse() {
    	return false;
    }

    // Support: IE <=9 - 11+
    // focus() and blur() are asynchronous, except when they are no-op.
    // So expect focus to be synchronous when the element is already active,
    // and blur to be synchronous when the element is not already active.
    // (focus and blur are always synchronous in other supported browsers,
    // this just defines when we can count on it).
    function expectSync( elem, type ) {
    	return ( elem === safeActiveElement() ) === ( type === "focus" );
    }

    // Support: IE <=9 only
    // Accessing document.activeElement can throw unexpectedly
    // https://bugs.jquery.com/ticket/13393
    function safeActiveElement() {
    	try {
    		return document.activeElement;
    	} catch ( err ) { }
    }

    function on( elem, types, selector, data, fn, one ) {
    	var origFn, type;

    	// Types can be a map of types/handlers
    	if ( typeof types === "object" ) {

    		// ( types-Object, selector, data )
    		if ( typeof selector !== "string" ) {

    			// ( types-Object, data )
    			data = data || selector;
    			selector = undefined;
    		}
    		for ( type in types ) {
    			on( elem, type, selector, data, types[ type ], one );
    		}
    		return elem;
    	}

    	if ( data == null && fn == null ) {

    		// ( types, fn )
    		fn = selector;
    		data = selector = undefined;
    	} else if ( fn == null ) {
    		if ( typeof selector === "string" ) {

    			// ( types, selector, fn )
    			fn = data;
    			data = undefined;
    		} else {

    			// ( types, data, fn )
    			fn = data;
    			data = selector;
    			selector = undefined;
    		}
    	}
    	if ( fn === false ) {
    		fn = returnFalse;
    	} else if ( !fn ) {
    		return elem;
    	}

    	if ( one === 1 ) {
    		origFn = fn;
    		fn = function( event ) {

    			// Can use an empty set, since event contains the info
    			jQuery().off( event );
    			return origFn.apply( this, arguments );
    		};

    		// Use same guid so caller can remove using origFn
    		fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
    	}
    	return elem.each( function() {
    		jQuery.event.add( this, types, fn, data, selector );
    	} );
    }

    /*
     * Helper functions for managing events -- not part of the public interface.
     * Props to Dean Edwards' addEvent library for many of the ideas.
     */
    jQuery.event = {

    	global: {},

    	add: function( elem, types, handler, data, selector ) {

    		var handleObjIn, eventHandle, tmp,
    			events, t, handleObj,
    			special, handlers, type, namespaces, origType,
    			elemData = dataPriv.get( elem );

    		// Only attach events to objects that accept data
    		if ( !acceptData( elem ) ) {
    			return;
    		}

    		// Caller can pass in an object of custom data in lieu of the handler
    		if ( handler.handler ) {
    			handleObjIn = handler;
    			handler = handleObjIn.handler;
    			selector = handleObjIn.selector;
    		}

    		// Ensure that invalid selectors throw exceptions at attach time
    		// Evaluate against documentElement in case elem is a non-element node (e.g., document)
    		if ( selector ) {
    			jQuery.find.matchesSelector( documentElement, selector );
    		}

    		// Make sure that the handler has a unique ID, used to find/remove it later
    		if ( !handler.guid ) {
    			handler.guid = jQuery.guid++;
    		}

    		// Init the element's event structure and main handler, if this is the first
    		if ( !( events = elemData.events ) ) {
    			events = elemData.events = Object.create( null );
    		}
    		if ( !( eventHandle = elemData.handle ) ) {
    			eventHandle = elemData.handle = function( e ) {

    				// Discard the second event of a jQuery.event.trigger() and
    				// when an event is called after a page has unloaded
    				return typeof jQuery !== "undefined" && jQuery.event.triggered !== e.type ?
    					jQuery.event.dispatch.apply( elem, arguments ) : undefined;
    			};
    		}

    		// Handle multiple events separated by a space
    		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
    		t = types.length;
    		while ( t-- ) {
    			tmp = rtypenamespace.exec( types[ t ] ) || [];
    			type = origType = tmp[ 1 ];
    			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

    			// There *must* be a type, no attaching namespace-only handlers
    			if ( !type ) {
    				continue;
    			}

    			// If event changes its type, use the special event handlers for the changed type
    			special = jQuery.event.special[ type ] || {};

    			// If selector defined, determine special event api type, otherwise given type
    			type = ( selector ? special.delegateType : special.bindType ) || type;

    			// Update special based on newly reset type
    			special = jQuery.event.special[ type ] || {};

    			// handleObj is passed to all event handlers
    			handleObj = jQuery.extend( {
    				type: type,
    				origType: origType,
    				data: data,
    				handler: handler,
    				guid: handler.guid,
    				selector: selector,
    				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
    				namespace: namespaces.join( "." )
    			}, handleObjIn );

    			// Init the event handler queue if we're the first
    			if ( !( handlers = events[ type ] ) ) {
    				handlers = events[ type ] = [];
    				handlers.delegateCount = 0;

    				// Only use addEventListener if the special events handler returns false
    				if ( !special.setup ||
    					special.setup.call( elem, data, namespaces, eventHandle ) === false ) {

    					if ( elem.addEventListener ) {
    						elem.addEventListener( type, eventHandle );
    					}
    				}
    			}

    			if ( special.add ) {
    				special.add.call( elem, handleObj );

    				if ( !handleObj.handler.guid ) {
    					handleObj.handler.guid = handler.guid;
    				}
    			}

    			// Add to the element's handler list, delegates in front
    			if ( selector ) {
    				handlers.splice( handlers.delegateCount++, 0, handleObj );
    			} else {
    				handlers.push( handleObj );
    			}

    			// Keep track of which events have ever been used, for event optimization
    			jQuery.event.global[ type ] = true;
    		}

    	},

    	// Detach an event or set of events from an element
    	remove: function( elem, types, handler, selector, mappedTypes ) {

    		var j, origCount, tmp,
    			events, t, handleObj,
    			special, handlers, type, namespaces, origType,
    			elemData = dataPriv.hasData( elem ) && dataPriv.get( elem );

    		if ( !elemData || !( events = elemData.events ) ) {
    			return;
    		}

    		// Once for each type.namespace in types; type may be omitted
    		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
    		t = types.length;
    		while ( t-- ) {
    			tmp = rtypenamespace.exec( types[ t ] ) || [];
    			type = origType = tmp[ 1 ];
    			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

    			// Unbind all events (on this namespace, if provided) for the element
    			if ( !type ) {
    				for ( type in events ) {
    					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
    				}
    				continue;
    			}

    			special = jQuery.event.special[ type ] || {};
    			type = ( selector ? special.delegateType : special.bindType ) || type;
    			handlers = events[ type ] || [];
    			tmp = tmp[ 2 ] &&
    				new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" );

    			// Remove matching events
    			origCount = j = handlers.length;
    			while ( j-- ) {
    				handleObj = handlers[ j ];

    				if ( ( mappedTypes || origType === handleObj.origType ) &&
    					( !handler || handler.guid === handleObj.guid ) &&
    					( !tmp || tmp.test( handleObj.namespace ) ) &&
    					( !selector || selector === handleObj.selector ||
    						selector === "**" && handleObj.selector ) ) {
    					handlers.splice( j, 1 );

    					if ( handleObj.selector ) {
    						handlers.delegateCount--;
    					}
    					if ( special.remove ) {
    						special.remove.call( elem, handleObj );
    					}
    				}
    			}

    			// Remove generic event handler if we removed something and no more handlers exist
    			// (avoids potential for endless recursion during removal of special event handlers)
    			if ( origCount && !handlers.length ) {
    				if ( !special.teardown ||
    					special.teardown.call( elem, namespaces, elemData.handle ) === false ) {

    					jQuery.removeEvent( elem, type, elemData.handle );
    				}

    				delete events[ type ];
    			}
    		}

    		// Remove data and the expando if it's no longer used
    		if ( jQuery.isEmptyObject( events ) ) {
    			dataPriv.remove( elem, "handle events" );
    		}
    	},

    	dispatch: function( nativeEvent ) {

    		var i, j, ret, matched, handleObj, handlerQueue,
    			args = new Array( arguments.length ),

    			// Make a writable jQuery.Event from the native event object
    			event = jQuery.event.fix( nativeEvent ),

    			handlers = (
    				dataPriv.get( this, "events" ) || Object.create( null )
    			)[ event.type ] || [],
    			special = jQuery.event.special[ event.type ] || {};

    		// Use the fix-ed jQuery.Event rather than the (read-only) native event
    		args[ 0 ] = event;

    		for ( i = 1; i < arguments.length; i++ ) {
    			args[ i ] = arguments[ i ];
    		}

    		event.delegateTarget = this;

    		// Call the preDispatch hook for the mapped type, and let it bail if desired
    		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
    			return;
    		}

    		// Determine handlers
    		handlerQueue = jQuery.event.handlers.call( this, event, handlers );

    		// Run delegates first; they may want to stop propagation beneath us
    		i = 0;
    		while ( ( matched = handlerQueue[ i++ ] ) && !event.isPropagationStopped() ) {
    			event.currentTarget = matched.elem;

    			j = 0;
    			while ( ( handleObj = matched.handlers[ j++ ] ) &&
    				!event.isImmediatePropagationStopped() ) {

    				// If the event is namespaced, then each handler is only invoked if it is
    				// specially universal or its namespaces are a superset of the event's.
    				if ( !event.rnamespace || handleObj.namespace === false ||
    					event.rnamespace.test( handleObj.namespace ) ) {

    					event.handleObj = handleObj;
    					event.data = handleObj.data;

    					ret = ( ( jQuery.event.special[ handleObj.origType ] || {} ).handle ||
    						handleObj.handler ).apply( matched.elem, args );

    					if ( ret !== undefined ) {
    						if ( ( event.result = ret ) === false ) {
    							event.preventDefault();
    							event.stopPropagation();
    						}
    					}
    				}
    			}
    		}

    		// Call the postDispatch hook for the mapped type
    		if ( special.postDispatch ) {
    			special.postDispatch.call( this, event );
    		}

    		return event.result;
    	},

    	handlers: function( event, handlers ) {
    		var i, handleObj, sel, matchedHandlers, matchedSelectors,
    			handlerQueue = [],
    			delegateCount = handlers.delegateCount,
    			cur = event.target;

    		// Find delegate handlers
    		if ( delegateCount &&

    			// Support: IE <=9
    			// Black-hole SVG <use> instance trees (trac-13180)
    			cur.nodeType &&

    			// Support: Firefox <=42
    			// Suppress spec-violating clicks indicating a non-primary pointer button (trac-3861)
    			// https://www.w3.org/TR/DOM-Level-3-Events/#event-type-click
    			// Support: IE 11 only
    			// ...but not arrow key "clicks" of radio inputs, which can have `button` -1 (gh-2343)
    			!( event.type === "click" && event.button >= 1 ) ) {

    			for ( ; cur !== this; cur = cur.parentNode || this ) {

    				// Don't check non-elements (#13208)
    				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
    				if ( cur.nodeType === 1 && !( event.type === "click" && cur.disabled === true ) ) {
    					matchedHandlers = [];
    					matchedSelectors = {};
    					for ( i = 0; i < delegateCount; i++ ) {
    						handleObj = handlers[ i ];

    						// Don't conflict with Object.prototype properties (#13203)
    						sel = handleObj.selector + " ";

    						if ( matchedSelectors[ sel ] === undefined ) {
    							matchedSelectors[ sel ] = handleObj.needsContext ?
    								jQuery( sel, this ).index( cur ) > -1 :
    								jQuery.find( sel, this, null, [ cur ] ).length;
    						}
    						if ( matchedSelectors[ sel ] ) {
    							matchedHandlers.push( handleObj );
    						}
    					}
    					if ( matchedHandlers.length ) {
    						handlerQueue.push( { elem: cur, handlers: matchedHandlers } );
    					}
    				}
    			}
    		}

    		// Add the remaining (directly-bound) handlers
    		cur = this;
    		if ( delegateCount < handlers.length ) {
    			handlerQueue.push( { elem: cur, handlers: handlers.slice( delegateCount ) } );
    		}

    		return handlerQueue;
    	},

    	addProp: function( name, hook ) {
    		Object.defineProperty( jQuery.Event.prototype, name, {
    			enumerable: true,
    			configurable: true,

    			get: isFunction( hook ) ?
    				function() {
    					if ( this.originalEvent ) {
    						return hook( this.originalEvent );
    					}
    				} :
    				function() {
    					if ( this.originalEvent ) {
    						return this.originalEvent[ name ];
    					}
    				},

    			set: function( value ) {
    				Object.defineProperty( this, name, {
    					enumerable: true,
    					configurable: true,
    					writable: true,
    					value: value
    				} );
    			}
    		} );
    	},

    	fix: function( originalEvent ) {
    		return originalEvent[ jQuery.expando ] ?
    			originalEvent :
    			new jQuery.Event( originalEvent );
    	},

    	special: {
    		load: {

    			// Prevent triggered image.load events from bubbling to window.load
    			noBubble: true
    		},
    		click: {

    			// Utilize native event to ensure correct state for checkable inputs
    			setup: function( data ) {

    				// For mutual compressibility with _default, replace `this` access with a local var.
    				// `|| data` is dead code meant only to preserve the variable through minification.
    				var el = this || data;

    				// Claim the first handler
    				if ( rcheckableType.test( el.type ) &&
    					el.click && nodeName( el, "input" ) ) {

    					// dataPriv.set( el, "click", ... )
    					leverageNative( el, "click", returnTrue );
    				}

    				// Return false to allow normal processing in the caller
    				return false;
    			},
    			trigger: function( data ) {

    				// For mutual compressibility with _default, replace `this` access with a local var.
    				// `|| data` is dead code meant only to preserve the variable through minification.
    				var el = this || data;

    				// Force setup before triggering a click
    				if ( rcheckableType.test( el.type ) &&
    					el.click && nodeName( el, "input" ) ) {

    					leverageNative( el, "click" );
    				}

    				// Return non-false to allow normal event-path propagation
    				return true;
    			},

    			// For cross-browser consistency, suppress native .click() on links
    			// Also prevent it if we're currently inside a leveraged native-event stack
    			_default: function( event ) {
    				var target = event.target;
    				return rcheckableType.test( target.type ) &&
    					target.click && nodeName( target, "input" ) &&
    					dataPriv.get( target, "click" ) ||
    					nodeName( target, "a" );
    			}
    		},

    		beforeunload: {
    			postDispatch: function( event ) {

    				// Support: Firefox 20+
    				// Firefox doesn't alert if the returnValue field is not set.
    				if ( event.result !== undefined && event.originalEvent ) {
    					event.originalEvent.returnValue = event.result;
    				}
    			}
    		}
    	}
    };

    // Ensure the presence of an event listener that handles manually-triggered
    // synthetic events by interrupting progress until reinvoked in response to
    // *native* events that it fires directly, ensuring that state changes have
    // already occurred before other listeners are invoked.
    function leverageNative( el, type, expectSync ) {

    	// Missing expectSync indicates a trigger call, which must force setup through jQuery.event.add
    	if ( !expectSync ) {
    		if ( dataPriv.get( el, type ) === undefined ) {
    			jQuery.event.add( el, type, returnTrue );
    		}
    		return;
    	}

    	// Register the controller as a special universal handler for all event namespaces
    	dataPriv.set( el, type, false );
    	jQuery.event.add( el, type, {
    		namespace: false,
    		handler: function( event ) {
    			var notAsync, result,
    				saved = dataPriv.get( this, type );

    			if ( ( event.isTrigger & 1 ) && this[ type ] ) {

    				// Interrupt processing of the outer synthetic .trigger()ed event
    				// Saved data should be false in such cases, but might be a leftover capture object
    				// from an async native handler (gh-4350)
    				if ( !saved.length ) {

    					// Store arguments for use when handling the inner native event
    					// There will always be at least one argument (an event object), so this array
    					// will not be confused with a leftover capture object.
    					saved = slice.call( arguments );
    					dataPriv.set( this, type, saved );

    					// Trigger the native event and capture its result
    					// Support: IE <=9 - 11+
    					// focus() and blur() are asynchronous
    					notAsync = expectSync( this, type );
    					this[ type ]();
    					result = dataPriv.get( this, type );
    					if ( saved !== result || notAsync ) {
    						dataPriv.set( this, type, false );
    					} else {
    						result = {};
    					}
    					if ( saved !== result ) {

    						// Cancel the outer synthetic event
    						event.stopImmediatePropagation();
    						event.preventDefault();

    						// Support: Chrome 86+
    						// In Chrome, if an element having a focusout handler is blurred by
    						// clicking outside of it, it invokes the handler synchronously. If
    						// that handler calls `.remove()` on the element, the data is cleared,
    						// leaving `result` undefined. We need to guard against this.
    						return result && result.value;
    					}

    				// If this is an inner synthetic event for an event with a bubbling surrogate
    				// (focus or blur), assume that the surrogate already propagated from triggering the
    				// native event and prevent that from happening again here.
    				// This technically gets the ordering wrong w.r.t. to `.trigger()` (in which the
    				// bubbling surrogate propagates *after* the non-bubbling base), but that seems
    				// less bad than duplication.
    				} else if ( ( jQuery.event.special[ type ] || {} ).delegateType ) {
    					event.stopPropagation();
    				}

    			// If this is a native event triggered above, everything is now in order
    			// Fire an inner synthetic event with the original arguments
    			} else if ( saved.length ) {

    				// ...and capture the result
    				dataPriv.set( this, type, {
    					value: jQuery.event.trigger(

    						// Support: IE <=9 - 11+
    						// Extend with the prototype to reset the above stopImmediatePropagation()
    						jQuery.extend( saved[ 0 ], jQuery.Event.prototype ),
    						saved.slice( 1 ),
    						this
    					)
    				} );

    				// Abort handling of the native event
    				event.stopImmediatePropagation();
    			}
    		}
    	} );
    }

    jQuery.removeEvent = function( elem, type, handle ) {

    	// This "if" is needed for plain objects
    	if ( elem.removeEventListener ) {
    		elem.removeEventListener( type, handle );
    	}
    };

    jQuery.Event = function( src, props ) {

    	// Allow instantiation without the 'new' keyword
    	if ( !( this instanceof jQuery.Event ) ) {
    		return new jQuery.Event( src, props );
    	}

    	// Event object
    	if ( src && src.type ) {
    		this.originalEvent = src;
    		this.type = src.type;

    		// Events bubbling up the document may have been marked as prevented
    		// by a handler lower down the tree; reflect the correct value.
    		this.isDefaultPrevented = src.defaultPrevented ||
    				src.defaultPrevented === undefined &&

    				// Support: Android <=2.3 only
    				src.returnValue === false ?
    			returnTrue :
    			returnFalse;

    		// Create target properties
    		// Support: Safari <=6 - 7 only
    		// Target should not be a text node (#504, #13143)
    		this.target = ( src.target && src.target.nodeType === 3 ) ?
    			src.target.parentNode :
    			src.target;

    		this.currentTarget = src.currentTarget;
    		this.relatedTarget = src.relatedTarget;

    	// Event type
    	} else {
    		this.type = src;
    	}

    	// Put explicitly provided properties onto the event object
    	if ( props ) {
    		jQuery.extend( this, props );
    	}

    	// Create a timestamp if incoming event doesn't have one
    	this.timeStamp = src && src.timeStamp || Date.now();

    	// Mark it as fixed
    	this[ jQuery.expando ] = true;
    };

    // jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
    // https://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
    jQuery.Event.prototype = {
    	constructor: jQuery.Event,
    	isDefaultPrevented: returnFalse,
    	isPropagationStopped: returnFalse,
    	isImmediatePropagationStopped: returnFalse,
    	isSimulated: false,

    	preventDefault: function() {
    		var e = this.originalEvent;

    		this.isDefaultPrevented = returnTrue;

    		if ( e && !this.isSimulated ) {
    			e.preventDefault();
    		}
    	},
    	stopPropagation: function() {
    		var e = this.originalEvent;

    		this.isPropagationStopped = returnTrue;

    		if ( e && !this.isSimulated ) {
    			e.stopPropagation();
    		}
    	},
    	stopImmediatePropagation: function() {
    		var e = this.originalEvent;

    		this.isImmediatePropagationStopped = returnTrue;

    		if ( e && !this.isSimulated ) {
    			e.stopImmediatePropagation();
    		}

    		this.stopPropagation();
    	}
    };

    // Includes all common event props including KeyEvent and MouseEvent specific props
    jQuery.each( {
    	altKey: true,
    	bubbles: true,
    	cancelable: true,
    	changedTouches: true,
    	ctrlKey: true,
    	detail: true,
    	eventPhase: true,
    	metaKey: true,
    	pageX: true,
    	pageY: true,
    	shiftKey: true,
    	view: true,
    	"char": true,
    	code: true,
    	charCode: true,
    	key: true,
    	keyCode: true,
    	button: true,
    	buttons: true,
    	clientX: true,
    	clientY: true,
    	offsetX: true,
    	offsetY: true,
    	pointerId: true,
    	pointerType: true,
    	screenX: true,
    	screenY: true,
    	targetTouches: true,
    	toElement: true,
    	touches: true,
    	which: true
    }, jQuery.event.addProp );

    jQuery.each( { focus: "focusin", blur: "focusout" }, function( type, delegateType ) {
    	jQuery.event.special[ type ] = {

    		// Utilize native event if possible so blur/focus sequence is correct
    		setup: function() {

    			// Claim the first handler
    			// dataPriv.set( this, "focus", ... )
    			// dataPriv.set( this, "blur", ... )
    			leverageNative( this, type, expectSync );

    			// Return false to allow normal processing in the caller
    			return false;
    		},
    		trigger: function() {

    			// Force setup before trigger
    			leverageNative( this, type );

    			// Return non-false to allow normal event-path propagation
    			return true;
    		},

    		// Suppress native focus or blur as it's already being fired
    		// in leverageNative.
    		_default: function() {
    			return true;
    		},

    		delegateType: delegateType
    	};
    } );

    // Create mouseenter/leave events using mouseover/out and event-time checks
    // so that event delegation works in jQuery.
    // Do the same for pointerenter/pointerleave and pointerover/pointerout
    //
    // Support: Safari 7 only
    // Safari sends mouseenter too often; see:
    // https://bugs.chromium.org/p/chromium/issues/detail?id=470258
    // for the description of the bug (it existed in older Chrome versions as well).
    jQuery.each( {
    	mouseenter: "mouseover",
    	mouseleave: "mouseout",
    	pointerenter: "pointerover",
    	pointerleave: "pointerout"
    }, function( orig, fix ) {
    	jQuery.event.special[ orig ] = {
    		delegateType: fix,
    		bindType: fix,

    		handle: function( event ) {
    			var ret,
    				target = this,
    				related = event.relatedTarget,
    				handleObj = event.handleObj;

    			// For mouseenter/leave call the handler if related is outside the target.
    			// NB: No relatedTarget if the mouse left/entered the browser window
    			if ( !related || ( related !== target && !jQuery.contains( target, related ) ) ) {
    				event.type = handleObj.origType;
    				ret = handleObj.handler.apply( this, arguments );
    				event.type = fix;
    			}
    			return ret;
    		}
    	};
    } );

    jQuery.fn.extend( {

    	on: function( types, selector, data, fn ) {
    		return on( this, types, selector, data, fn );
    	},
    	one: function( types, selector, data, fn ) {
    		return on( this, types, selector, data, fn, 1 );
    	},
    	off: function( types, selector, fn ) {
    		var handleObj, type;
    		if ( types && types.preventDefault && types.handleObj ) {

    			// ( event )  dispatched jQuery.Event
    			handleObj = types.handleObj;
    			jQuery( types.delegateTarget ).off(
    				handleObj.namespace ?
    					handleObj.origType + "." + handleObj.namespace :
    					handleObj.origType,
    				handleObj.selector,
    				handleObj.handler
    			);
    			return this;
    		}
    		if ( typeof types === "object" ) {

    			// ( types-object [, selector] )
    			for ( type in types ) {
    				this.off( type, selector, types[ type ] );
    			}
    			return this;
    		}
    		if ( selector === false || typeof selector === "function" ) {

    			// ( types [, fn] )
    			fn = selector;
    			selector = undefined;
    		}
    		if ( fn === false ) {
    			fn = returnFalse;
    		}
    		return this.each( function() {
    			jQuery.event.remove( this, types, fn, selector );
    		} );
    	}
    } );


    var

    	// Support: IE <=10 - 11, Edge 12 - 13 only
    	// In IE/Edge using regex groups here causes severe slowdowns.
    	// See https://connect.microsoft.com/IE/feedback/details/1736512/
    	rnoInnerhtml = /<script|<style|<link/i,

    	// checked="checked" or checked
    	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
    	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;

    // Prefer a tbody over its parent table for containing new rows
    function manipulationTarget( elem, content ) {
    	if ( nodeName( elem, "table" ) &&
    		nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ) {

    		return jQuery( elem ).children( "tbody" )[ 0 ] || elem;
    	}

    	return elem;
    }

    // Replace/restore the type attribute of script elements for safe DOM manipulation
    function disableScript( elem ) {
    	elem.type = ( elem.getAttribute( "type" ) !== null ) + "/" + elem.type;
    	return elem;
    }
    function restoreScript( elem ) {
    	if ( ( elem.type || "" ).slice( 0, 5 ) === "true/" ) {
    		elem.type = elem.type.slice( 5 );
    	} else {
    		elem.removeAttribute( "type" );
    	}

    	return elem;
    }

    function cloneCopyEvent( src, dest ) {
    	var i, l, type, pdataOld, udataOld, udataCur, events;

    	if ( dest.nodeType !== 1 ) {
    		return;
    	}

    	// 1. Copy private data: events, handlers, etc.
    	if ( dataPriv.hasData( src ) ) {
    		pdataOld = dataPriv.get( src );
    		events = pdataOld.events;

    		if ( events ) {
    			dataPriv.remove( dest, "handle events" );

    			for ( type in events ) {
    				for ( i = 0, l = events[ type ].length; i < l; i++ ) {
    					jQuery.event.add( dest, type, events[ type ][ i ] );
    				}
    			}
    		}
    	}

    	// 2. Copy user data
    	if ( dataUser.hasData( src ) ) {
    		udataOld = dataUser.access( src );
    		udataCur = jQuery.extend( {}, udataOld );

    		dataUser.set( dest, udataCur );
    	}
    }

    // Fix IE bugs, see support tests
    function fixInput( src, dest ) {
    	var nodeName = dest.nodeName.toLowerCase();

    	// Fails to persist the checked state of a cloned checkbox or radio button.
    	if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
    		dest.checked = src.checked;

    	// Fails to return the selected option to the default selected state when cloning options
    	} else if ( nodeName === "input" || nodeName === "textarea" ) {
    		dest.defaultValue = src.defaultValue;
    	}
    }

    function domManip( collection, args, callback, ignored ) {

    	// Flatten any nested arrays
    	args = flat( args );

    	var fragment, first, scripts, hasScripts, node, doc,
    		i = 0,
    		l = collection.length,
    		iNoClone = l - 1,
    		value = args[ 0 ],
    		valueIsFunction = isFunction( value );

    	// We can't cloneNode fragments that contain checked, in WebKit
    	if ( valueIsFunction ||
    			( l > 1 && typeof value === "string" &&
    				!support.checkClone && rchecked.test( value ) ) ) {
    		return collection.each( function( index ) {
    			var self = collection.eq( index );
    			if ( valueIsFunction ) {
    				args[ 0 ] = value.call( this, index, self.html() );
    			}
    			domManip( self, args, callback, ignored );
    		} );
    	}

    	if ( l ) {
    		fragment = buildFragment( args, collection[ 0 ].ownerDocument, false, collection, ignored );
    		first = fragment.firstChild;

    		if ( fragment.childNodes.length === 1 ) {
    			fragment = first;
    		}

    		// Require either new content or an interest in ignored elements to invoke the callback
    		if ( first || ignored ) {
    			scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
    			hasScripts = scripts.length;

    			// Use the original fragment for the last item
    			// instead of the first because it can end up
    			// being emptied incorrectly in certain situations (#8070).
    			for ( ; i < l; i++ ) {
    				node = fragment;

    				if ( i !== iNoClone ) {
    					node = jQuery.clone( node, true, true );

    					// Keep references to cloned scripts for later restoration
    					if ( hasScripts ) {

    						// Support: Android <=4.0 only, PhantomJS 1 only
    						// push.apply(_, arraylike) throws on ancient WebKit
    						jQuery.merge( scripts, getAll( node, "script" ) );
    					}
    				}

    				callback.call( collection[ i ], node, i );
    			}

    			if ( hasScripts ) {
    				doc = scripts[ scripts.length - 1 ].ownerDocument;

    				// Reenable scripts
    				jQuery.map( scripts, restoreScript );

    				// Evaluate executable scripts on first document insertion
    				for ( i = 0; i < hasScripts; i++ ) {
    					node = scripts[ i ];
    					if ( rscriptType.test( node.type || "" ) &&
    						!dataPriv.access( node, "globalEval" ) &&
    						jQuery.contains( doc, node ) ) {

    						if ( node.src && ( node.type || "" ).toLowerCase()  !== "module" ) {

    							// Optional AJAX dependency, but won't run scripts if not present
    							if ( jQuery._evalUrl && !node.noModule ) {
    								jQuery._evalUrl( node.src, {
    									nonce: node.nonce || node.getAttribute( "nonce" )
    								}, doc );
    							}
    						} else {
    							DOMEval( node.textContent.replace( rcleanScript, "" ), node, doc );
    						}
    					}
    				}
    			}
    		}
    	}

    	return collection;
    }

    function remove( elem, selector, keepData ) {
    	var node,
    		nodes = selector ? jQuery.filter( selector, elem ) : elem,
    		i = 0;

    	for ( ; ( node = nodes[ i ] ) != null; i++ ) {
    		if ( !keepData && node.nodeType === 1 ) {
    			jQuery.cleanData( getAll( node ) );
    		}

    		if ( node.parentNode ) {
    			if ( keepData && isAttached( node ) ) {
    				setGlobalEval( getAll( node, "script" ) );
    			}
    			node.parentNode.removeChild( node );
    		}
    	}

    	return elem;
    }

    jQuery.extend( {
    	htmlPrefilter: function( html ) {
    		return html;
    	},

    	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
    		var i, l, srcElements, destElements,
    			clone = elem.cloneNode( true ),
    			inPage = isAttached( elem );

    		// Fix IE cloning issues
    		if ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&
    				!jQuery.isXMLDoc( elem ) ) {

    			// We eschew Sizzle here for performance reasons: https://jsperf.com/getall-vs-sizzle/2
    			destElements = getAll( clone );
    			srcElements = getAll( elem );

    			for ( i = 0, l = srcElements.length; i < l; i++ ) {
    				fixInput( srcElements[ i ], destElements[ i ] );
    			}
    		}

    		// Copy the events from the original to the clone
    		if ( dataAndEvents ) {
    			if ( deepDataAndEvents ) {
    				srcElements = srcElements || getAll( elem );
    				destElements = destElements || getAll( clone );

    				for ( i = 0, l = srcElements.length; i < l; i++ ) {
    					cloneCopyEvent( srcElements[ i ], destElements[ i ] );
    				}
    			} else {
    				cloneCopyEvent( elem, clone );
    			}
    		}

    		// Preserve script evaluation history
    		destElements = getAll( clone, "script" );
    		if ( destElements.length > 0 ) {
    			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
    		}

    		// Return the cloned set
    		return clone;
    	},

    	cleanData: function( elems ) {
    		var data, elem, type,
    			special = jQuery.event.special,
    			i = 0;

    		for ( ; ( elem = elems[ i ] ) !== undefined; i++ ) {
    			if ( acceptData( elem ) ) {
    				if ( ( data = elem[ dataPriv.expando ] ) ) {
    					if ( data.events ) {
    						for ( type in data.events ) {
    							if ( special[ type ] ) {
    								jQuery.event.remove( elem, type );

    							// This is a shortcut to avoid jQuery.event.remove's overhead
    							} else {
    								jQuery.removeEvent( elem, type, data.handle );
    							}
    						}
    					}

    					// Support: Chrome <=35 - 45+
    					// Assign undefined instead of using delete, see Data#remove
    					elem[ dataPriv.expando ] = undefined;
    				}
    				if ( elem[ dataUser.expando ] ) {

    					// Support: Chrome <=35 - 45+
    					// Assign undefined instead of using delete, see Data#remove
    					elem[ dataUser.expando ] = undefined;
    				}
    			}
    		}
    	}
    } );

    jQuery.fn.extend( {
    	detach: function( selector ) {
    		return remove( this, selector, true );
    	},

    	remove: function( selector ) {
    		return remove( this, selector );
    	},

    	text: function( value ) {
    		return access( this, function( value ) {
    			return value === undefined ?
    				jQuery.text( this ) :
    				this.empty().each( function() {
    					if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
    						this.textContent = value;
    					}
    				} );
    		}, null, value, arguments.length );
    	},

    	append: function() {
    		return domManip( this, arguments, function( elem ) {
    			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
    				var target = manipulationTarget( this, elem );
    				target.appendChild( elem );
    			}
    		} );
    	},

    	prepend: function() {
    		return domManip( this, arguments, function( elem ) {
    			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
    				var target = manipulationTarget( this, elem );
    				target.insertBefore( elem, target.firstChild );
    			}
    		} );
    	},

    	before: function() {
    		return domManip( this, arguments, function( elem ) {
    			if ( this.parentNode ) {
    				this.parentNode.insertBefore( elem, this );
    			}
    		} );
    	},

    	after: function() {
    		return domManip( this, arguments, function( elem ) {
    			if ( this.parentNode ) {
    				this.parentNode.insertBefore( elem, this.nextSibling );
    			}
    		} );
    	},

    	empty: function() {
    		var elem,
    			i = 0;

    		for ( ; ( elem = this[ i ] ) != null; i++ ) {
    			if ( elem.nodeType === 1 ) {

    				// Prevent memory leaks
    				jQuery.cleanData( getAll( elem, false ) );

    				// Remove any remaining nodes
    				elem.textContent = "";
    			}
    		}

    		return this;
    	},

    	clone: function( dataAndEvents, deepDataAndEvents ) {
    		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
    		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

    		return this.map( function() {
    			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
    		} );
    	},

    	html: function( value ) {
    		return access( this, function( value ) {
    			var elem = this[ 0 ] || {},
    				i = 0,
    				l = this.length;

    			if ( value === undefined && elem.nodeType === 1 ) {
    				return elem.innerHTML;
    			}

    			// See if we can take a shortcut and just use innerHTML
    			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
    				!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {

    				value = jQuery.htmlPrefilter( value );

    				try {
    					for ( ; i < l; i++ ) {
    						elem = this[ i ] || {};

    						// Remove element nodes and prevent memory leaks
    						if ( elem.nodeType === 1 ) {
    							jQuery.cleanData( getAll( elem, false ) );
    							elem.innerHTML = value;
    						}
    					}

    					elem = 0;

    				// If using innerHTML throws an exception, use the fallback method
    				} catch ( e ) {}
    			}

    			if ( elem ) {
    				this.empty().append( value );
    			}
    		}, null, value, arguments.length );
    	},

    	replaceWith: function() {
    		var ignored = [];

    		// Make the changes, replacing each non-ignored context element with the new content
    		return domManip( this, arguments, function( elem ) {
    			var parent = this.parentNode;

    			if ( jQuery.inArray( this, ignored ) < 0 ) {
    				jQuery.cleanData( getAll( this ) );
    				if ( parent ) {
    					parent.replaceChild( elem, this );
    				}
    			}

    		// Force callback invocation
    		}, ignored );
    	}
    } );

    jQuery.each( {
    	appendTo: "append",
    	prependTo: "prepend",
    	insertBefore: "before",
    	insertAfter: "after",
    	replaceAll: "replaceWith"
    }, function( name, original ) {
    	jQuery.fn[ name ] = function( selector ) {
    		var elems,
    			ret = [],
    			insert = jQuery( selector ),
    			last = insert.length - 1,
    			i = 0;

    		for ( ; i <= last; i++ ) {
    			elems = i === last ? this : this.clone( true );
    			jQuery( insert[ i ] )[ original ]( elems );

    			// Support: Android <=4.0 only, PhantomJS 1 only
    			// .get() because push.apply(_, arraylike) throws on ancient WebKit
    			push.apply( ret, elems.get() );
    		}

    		return this.pushStack( ret );
    	};
    } );
    var rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );

    var getStyles = function( elem ) {

    		// Support: IE <=11 only, Firefox <=30 (#15098, #14150)
    		// IE throws on elements created in popups
    		// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
    		var view = elem.ownerDocument.defaultView;

    		if ( !view || !view.opener ) {
    			view = window;
    		}

    		return view.getComputedStyle( elem );
    	};

    var swap = function( elem, options, callback ) {
    	var ret, name,
    		old = {};

    	// Remember the old values, and insert the new ones
    	for ( name in options ) {
    		old[ name ] = elem.style[ name ];
    		elem.style[ name ] = options[ name ];
    	}

    	ret = callback.call( elem );

    	// Revert the old values
    	for ( name in options ) {
    		elem.style[ name ] = old[ name ];
    	}

    	return ret;
    };


    var rboxStyle = new RegExp( cssExpand.join( "|" ), "i" );



    ( function() {

    	// Executing both pixelPosition & boxSizingReliable tests require only one layout
    	// so they're executed at the same time to save the second computation.
    	function computeStyleTests() {

    		// This is a singleton, we need to execute it only once
    		if ( !div ) {
    			return;
    		}

    		container.style.cssText = "position:absolute;left:-11111px;width:60px;" +
    			"margin-top:1px;padding:0;border:0";
    		div.style.cssText =
    			"position:relative;display:block;box-sizing:border-box;overflow:scroll;" +
    			"margin:auto;border:1px;padding:1px;" +
    			"width:60%;top:1%";
    		documentElement.appendChild( container ).appendChild( div );

    		var divStyle = window.getComputedStyle( div );
    		pixelPositionVal = divStyle.top !== "1%";

    		// Support: Android 4.0 - 4.3 only, Firefox <=3 - 44
    		reliableMarginLeftVal = roundPixelMeasures( divStyle.marginLeft ) === 12;

    		// Support: Android 4.0 - 4.3 only, Safari <=9.1 - 10.1, iOS <=7.0 - 9.3
    		// Some styles come back with percentage values, even though they shouldn't
    		div.style.right = "60%";
    		pixelBoxStylesVal = roundPixelMeasures( divStyle.right ) === 36;

    		// Support: IE 9 - 11 only
    		// Detect misreporting of content dimensions for box-sizing:border-box elements
    		boxSizingReliableVal = roundPixelMeasures( divStyle.width ) === 36;

    		// Support: IE 9 only
    		// Detect overflow:scroll screwiness (gh-3699)
    		// Support: Chrome <=64
    		// Don't get tricked when zoom affects offsetWidth (gh-4029)
    		div.style.position = "absolute";
    		scrollboxSizeVal = roundPixelMeasures( div.offsetWidth / 3 ) === 12;

    		documentElement.removeChild( container );

    		// Nullify the div so it wouldn't be stored in the memory and
    		// it will also be a sign that checks already performed
    		div = null;
    	}

    	function roundPixelMeasures( measure ) {
    		return Math.round( parseFloat( measure ) );
    	}

    	var pixelPositionVal, boxSizingReliableVal, scrollboxSizeVal, pixelBoxStylesVal,
    		reliableTrDimensionsVal, reliableMarginLeftVal,
    		container = document.createElement( "div" ),
    		div = document.createElement( "div" );

    	// Finish early in limited (non-browser) environments
    	if ( !div.style ) {
    		return;
    	}

    	// Support: IE <=9 - 11 only
    	// Style of cloned element affects source element cloned (#8908)
    	div.style.backgroundClip = "content-box";
    	div.cloneNode( true ).style.backgroundClip = "";
    	support.clearCloneStyle = div.style.backgroundClip === "content-box";

    	jQuery.extend( support, {
    		boxSizingReliable: function() {
    			computeStyleTests();
    			return boxSizingReliableVal;
    		},
    		pixelBoxStyles: function() {
    			computeStyleTests();
    			return pixelBoxStylesVal;
    		},
    		pixelPosition: function() {
    			computeStyleTests();
    			return pixelPositionVal;
    		},
    		reliableMarginLeft: function() {
    			computeStyleTests();
    			return reliableMarginLeftVal;
    		},
    		scrollboxSize: function() {
    			computeStyleTests();
    			return scrollboxSizeVal;
    		},

    		// Support: IE 9 - 11+, Edge 15 - 18+
    		// IE/Edge misreport `getComputedStyle` of table rows with width/height
    		// set in CSS while `offset*` properties report correct values.
    		// Behavior in IE 9 is more subtle than in newer versions & it passes
    		// some versions of this test; make sure not to make it pass there!
    		//
    		// Support: Firefox 70+
    		// Only Firefox includes border widths
    		// in computed dimensions. (gh-4529)
    		reliableTrDimensions: function() {
    			var table, tr, trChild, trStyle;
    			if ( reliableTrDimensionsVal == null ) {
    				table = document.createElement( "table" );
    				tr = document.createElement( "tr" );
    				trChild = document.createElement( "div" );

    				table.style.cssText = "position:absolute;left:-11111px;border-collapse:separate";
    				tr.style.cssText = "border:1px solid";

    				// Support: Chrome 86+
    				// Height set through cssText does not get applied.
    				// Computed height then comes back as 0.
    				tr.style.height = "1px";
    				trChild.style.height = "9px";

    				// Support: Android 8 Chrome 86+
    				// In our bodyBackground.html iframe,
    				// display for all div elements is set to "inline",
    				// which causes a problem only in Android 8 Chrome 86.
    				// Ensuring the div is display: block
    				// gets around this issue.
    				trChild.style.display = "block";

    				documentElement
    					.appendChild( table )
    					.appendChild( tr )
    					.appendChild( trChild );

    				trStyle = window.getComputedStyle( tr );
    				reliableTrDimensionsVal = ( parseInt( trStyle.height, 10 ) +
    					parseInt( trStyle.borderTopWidth, 10 ) +
    					parseInt( trStyle.borderBottomWidth, 10 ) ) === tr.offsetHeight;

    				documentElement.removeChild( table );
    			}
    			return reliableTrDimensionsVal;
    		}
    	} );
    } )();


    function curCSS( elem, name, computed ) {
    	var width, minWidth, maxWidth, ret,

    		// Support: Firefox 51+
    		// Retrieving style before computed somehow
    		// fixes an issue with getting wrong values
    		// on detached elements
    		style = elem.style;

    	computed = computed || getStyles( elem );

    	// getPropertyValue is needed for:
    	//   .css('filter') (IE 9 only, #12537)
    	//   .css('--customProperty) (#3144)
    	if ( computed ) {
    		ret = computed.getPropertyValue( name ) || computed[ name ];

    		if ( ret === "" && !isAttached( elem ) ) {
    			ret = jQuery.style( elem, name );
    		}

    		// A tribute to the "awesome hack by Dean Edwards"
    		// Android Browser returns percentage for some values,
    		// but width seems to be reliably pixels.
    		// This is against the CSSOM draft spec:
    		// https://drafts.csswg.org/cssom/#resolved-values
    		if ( !support.pixelBoxStyles() && rnumnonpx.test( ret ) && rboxStyle.test( name ) ) {

    			// Remember the original values
    			width = style.width;
    			minWidth = style.minWidth;
    			maxWidth = style.maxWidth;

    			// Put in the new values to get a computed value out
    			style.minWidth = style.maxWidth = style.width = ret;
    			ret = computed.width;

    			// Revert the changed values
    			style.width = width;
    			style.minWidth = minWidth;
    			style.maxWidth = maxWidth;
    		}
    	}

    	return ret !== undefined ?

    		// Support: IE <=9 - 11 only
    		// IE returns zIndex value as an integer.
    		ret + "" :
    		ret;
    }


    function addGetHookIf( conditionFn, hookFn ) {

    	// Define the hook, we'll check on the first run if it's really needed.
    	return {
    		get: function() {
    			if ( conditionFn() ) {

    				// Hook not needed (or it's not possible to use it due
    				// to missing dependency), remove it.
    				delete this.get;
    				return;
    			}

    			// Hook needed; redefine it so that the support test is not executed again.
    			return ( this.get = hookFn ).apply( this, arguments );
    		}
    	};
    }


    var cssPrefixes = [ "Webkit", "Moz", "ms" ],
    	emptyStyle = document.createElement( "div" ).style,
    	vendorProps = {};

    // Return a vendor-prefixed property or undefined
    function vendorPropName( name ) {

    	// Check for vendor prefixed names
    	var capName = name[ 0 ].toUpperCase() + name.slice( 1 ),
    		i = cssPrefixes.length;

    	while ( i-- ) {
    		name = cssPrefixes[ i ] + capName;
    		if ( name in emptyStyle ) {
    			return name;
    		}
    	}
    }

    // Return a potentially-mapped jQuery.cssProps or vendor prefixed property
    function finalPropName( name ) {
    	var final = jQuery.cssProps[ name ] || vendorProps[ name ];

    	if ( final ) {
    		return final;
    	}
    	if ( name in emptyStyle ) {
    		return name;
    	}
    	return vendorProps[ name ] = vendorPropName( name ) || name;
    }


    var

    	// Swappable if display is none or starts with table
    	// except "table", "table-cell", or "table-caption"
    	// See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
    	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
    	rcustomProp = /^--/,
    	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
    	cssNormalTransform = {
    		letterSpacing: "0",
    		fontWeight: "400"
    	};

    function setPositiveNumber( _elem, value, subtract ) {

    	// Any relative (+/-) values have already been
    	// normalized at this point
    	var matches = rcssNum.exec( value );
    	return matches ?

    		// Guard against undefined "subtract", e.g., when used as in cssHooks
    		Math.max( 0, matches[ 2 ] - ( subtract || 0 ) ) + ( matches[ 3 ] || "px" ) :
    		value;
    }

    function boxModelAdjustment( elem, dimension, box, isBorderBox, styles, computedVal ) {
    	var i = dimension === "width" ? 1 : 0,
    		extra = 0,
    		delta = 0;

    	// Adjustment may not be necessary
    	if ( box === ( isBorderBox ? "border" : "content" ) ) {
    		return 0;
    	}

    	for ( ; i < 4; i += 2 ) {

    		// Both box models exclude margin
    		if ( box === "margin" ) {
    			delta += jQuery.css( elem, box + cssExpand[ i ], true, styles );
    		}

    		// If we get here with a content-box, we're seeking "padding" or "border" or "margin"
    		if ( !isBorderBox ) {

    			// Add padding
    			delta += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );

    			// For "border" or "margin", add border
    			if ( box !== "padding" ) {
    				delta += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );

    			// But still keep track of it otherwise
    			} else {
    				extra += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
    			}

    		// If we get here with a border-box (content + padding + border), we're seeking "content" or
    		// "padding" or "margin"
    		} else {

    			// For "content", subtract padding
    			if ( box === "content" ) {
    				delta -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
    			}

    			// For "content" or "padding", subtract border
    			if ( box !== "margin" ) {
    				delta -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
    			}
    		}
    	}

    	// Account for positive content-box scroll gutter when requested by providing computedVal
    	if ( !isBorderBox && computedVal >= 0 ) {

    		// offsetWidth/offsetHeight is a rounded sum of content, padding, scroll gutter, and border
    		// Assuming integer scroll gutter, subtract the rest and round down
    		delta += Math.max( 0, Math.ceil(
    			elem[ "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 ) ] -
    			computedVal -
    			delta -
    			extra -
    			0.5

    		// If offsetWidth/offsetHeight is unknown, then we can't determine content-box scroll gutter
    		// Use an explicit zero to avoid NaN (gh-3964)
    		) ) || 0;
    	}

    	return delta;
    }

    function getWidthOrHeight( elem, dimension, extra ) {

    	// Start with computed style
    	var styles = getStyles( elem ),

    		// To avoid forcing a reflow, only fetch boxSizing if we need it (gh-4322).
    		// Fake content-box until we know it's needed to know the true value.
    		boxSizingNeeded = !support.boxSizingReliable() || extra,
    		isBorderBox = boxSizingNeeded &&
    			jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
    		valueIsBorderBox = isBorderBox,

    		val = curCSS( elem, dimension, styles ),
    		offsetProp = "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 );

    	// Support: Firefox <=54
    	// Return a confounding non-pixel value or feign ignorance, as appropriate.
    	if ( rnumnonpx.test( val ) ) {
    		if ( !extra ) {
    			return val;
    		}
    		val = "auto";
    	}


    	// Support: IE 9 - 11 only
    	// Use offsetWidth/offsetHeight for when box sizing is unreliable.
    	// In those cases, the computed value can be trusted to be border-box.
    	if ( ( !support.boxSizingReliable() && isBorderBox ||

    		// Support: IE 10 - 11+, Edge 15 - 18+
    		// IE/Edge misreport `getComputedStyle` of table rows with width/height
    		// set in CSS while `offset*` properties report correct values.
    		// Interestingly, in some cases IE 9 doesn't suffer from this issue.
    		!support.reliableTrDimensions() && nodeName( elem, "tr" ) ||

    		// Fall back to offsetWidth/offsetHeight when value is "auto"
    		// This happens for inline elements with no explicit setting (gh-3571)
    		val === "auto" ||

    		// Support: Android <=4.1 - 4.3 only
    		// Also use offsetWidth/offsetHeight for misreported inline dimensions (gh-3602)
    		!parseFloat( val ) && jQuery.css( elem, "display", false, styles ) === "inline" ) &&

    		// Make sure the element is visible & connected
    		elem.getClientRects().length ) {

    		isBorderBox = jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

    		// Where available, offsetWidth/offsetHeight approximate border box dimensions.
    		// Where not available (e.g., SVG), assume unreliable box-sizing and interpret the
    		// retrieved value as a content box dimension.
    		valueIsBorderBox = offsetProp in elem;
    		if ( valueIsBorderBox ) {
    			val = elem[ offsetProp ];
    		}
    	}

    	// Normalize "" and auto
    	val = parseFloat( val ) || 0;

    	// Adjust for the element's box model
    	return ( val +
    		boxModelAdjustment(
    			elem,
    			dimension,
    			extra || ( isBorderBox ? "border" : "content" ),
    			valueIsBorderBox,
    			styles,

    			// Provide the current computed size to request scroll gutter calculation (gh-3589)
    			val
    		)
    	) + "px";
    }

    jQuery.extend( {

    	// Add in style property hooks for overriding the default
    	// behavior of getting and setting a style property
    	cssHooks: {
    		opacity: {
    			get: function( elem, computed ) {
    				if ( computed ) {

    					// We should always get a number back from opacity
    					var ret = curCSS( elem, "opacity" );
    					return ret === "" ? "1" : ret;
    				}
    			}
    		}
    	},

    	// Don't automatically add "px" to these possibly-unitless properties
    	cssNumber: {
    		"animationIterationCount": true,
    		"columnCount": true,
    		"fillOpacity": true,
    		"flexGrow": true,
    		"flexShrink": true,
    		"fontWeight": true,
    		"gridArea": true,
    		"gridColumn": true,
    		"gridColumnEnd": true,
    		"gridColumnStart": true,
    		"gridRow": true,
    		"gridRowEnd": true,
    		"gridRowStart": true,
    		"lineHeight": true,
    		"opacity": true,
    		"order": true,
    		"orphans": true,
    		"widows": true,
    		"zIndex": true,
    		"zoom": true
    	},

    	// Add in properties whose names you wish to fix before
    	// setting or getting the value
    	cssProps: {},

    	// Get and set the style property on a DOM Node
    	style: function( elem, name, value, extra ) {

    		// Don't set styles on text and comment nodes
    		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
    			return;
    		}

    		// Make sure that we're working with the right name
    		var ret, type, hooks,
    			origName = camelCase( name ),
    			isCustomProp = rcustomProp.test( name ),
    			style = elem.style;

    		// Make sure that we're working with the right name. We don't
    		// want to query the value if it is a CSS custom property
    		// since they are user-defined.
    		if ( !isCustomProp ) {
    			name = finalPropName( origName );
    		}

    		// Gets hook for the prefixed version, then unprefixed version
    		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

    		// Check if we're setting a value
    		if ( value !== undefined ) {
    			type = typeof value;

    			// Convert "+=" or "-=" to relative numbers (#7345)
    			if ( type === "string" && ( ret = rcssNum.exec( value ) ) && ret[ 1 ] ) {
    				value = adjustCSS( elem, name, ret );

    				// Fixes bug #9237
    				type = "number";
    			}

    			// Make sure that null and NaN values aren't set (#7116)
    			if ( value == null || value !== value ) {
    				return;
    			}

    			// If a number was passed in, add the unit (except for certain CSS properties)
    			// The isCustomProp check can be removed in jQuery 4.0 when we only auto-append
    			// "px" to a few hardcoded values.
    			if ( type === "number" && !isCustomProp ) {
    				value += ret && ret[ 3 ] || ( jQuery.cssNumber[ origName ] ? "" : "px" );
    			}

    			// background-* props affect original clone's values
    			if ( !support.clearCloneStyle && value === "" && name.indexOf( "background" ) === 0 ) {
    				style[ name ] = "inherit";
    			}

    			// If a hook was provided, use that value, otherwise just set the specified value
    			if ( !hooks || !( "set" in hooks ) ||
    				( value = hooks.set( elem, value, extra ) ) !== undefined ) {

    				if ( isCustomProp ) {
    					style.setProperty( name, value );
    				} else {
    					style[ name ] = value;
    				}
    			}

    		} else {

    			// If a hook was provided get the non-computed value from there
    			if ( hooks && "get" in hooks &&
    				( ret = hooks.get( elem, false, extra ) ) !== undefined ) {

    				return ret;
    			}

    			// Otherwise just get the value from the style object
    			return style[ name ];
    		}
    	},

    	css: function( elem, name, extra, styles ) {
    		var val, num, hooks,
    			origName = camelCase( name ),
    			isCustomProp = rcustomProp.test( name );

    		// Make sure that we're working with the right name. We don't
    		// want to modify the value if it is a CSS custom property
    		// since they are user-defined.
    		if ( !isCustomProp ) {
    			name = finalPropName( origName );
    		}

    		// Try prefixed name followed by the unprefixed name
    		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

    		// If a hook was provided get the computed value from there
    		if ( hooks && "get" in hooks ) {
    			val = hooks.get( elem, true, extra );
    		}

    		// Otherwise, if a way to get the computed value exists, use that
    		if ( val === undefined ) {
    			val = curCSS( elem, name, styles );
    		}

    		// Convert "normal" to computed value
    		if ( val === "normal" && name in cssNormalTransform ) {
    			val = cssNormalTransform[ name ];
    		}

    		// Make numeric if forced or a qualifier was provided and val looks numeric
    		if ( extra === "" || extra ) {
    			num = parseFloat( val );
    			return extra === true || isFinite( num ) ? num || 0 : val;
    		}

    		return val;
    	}
    } );

    jQuery.each( [ "height", "width" ], function( _i, dimension ) {
    	jQuery.cssHooks[ dimension ] = {
    		get: function( elem, computed, extra ) {
    			if ( computed ) {

    				// Certain elements can have dimension info if we invisibly show them
    				// but it must have a current display style that would benefit
    				return rdisplayswap.test( jQuery.css( elem, "display" ) ) &&

    					// Support: Safari 8+
    					// Table columns in Safari have non-zero offsetWidth & zero
    					// getBoundingClientRect().width unless display is changed.
    					// Support: IE <=11 only
    					// Running getBoundingClientRect on a disconnected node
    					// in IE throws an error.
    					( !elem.getClientRects().length || !elem.getBoundingClientRect().width ) ?
    					swap( elem, cssShow, function() {
    						return getWidthOrHeight( elem, dimension, extra );
    					} ) :
    					getWidthOrHeight( elem, dimension, extra );
    			}
    		},

    		set: function( elem, value, extra ) {
    			var matches,
    				styles = getStyles( elem ),

    				// Only read styles.position if the test has a chance to fail
    				// to avoid forcing a reflow.
    				scrollboxSizeBuggy = !support.scrollboxSize() &&
    					styles.position === "absolute",

    				// To avoid forcing a reflow, only fetch boxSizing if we need it (gh-3991)
    				boxSizingNeeded = scrollboxSizeBuggy || extra,
    				isBorderBox = boxSizingNeeded &&
    					jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
    				subtract = extra ?
    					boxModelAdjustment(
    						elem,
    						dimension,
    						extra,
    						isBorderBox,
    						styles
    					) :
    					0;

    			// Account for unreliable border-box dimensions by comparing offset* to computed and
    			// faking a content-box to get border and padding (gh-3699)
    			if ( isBorderBox && scrollboxSizeBuggy ) {
    				subtract -= Math.ceil(
    					elem[ "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 ) ] -
    					parseFloat( styles[ dimension ] ) -
    					boxModelAdjustment( elem, dimension, "border", false, styles ) -
    					0.5
    				);
    			}

    			// Convert to pixels if value adjustment is needed
    			if ( subtract && ( matches = rcssNum.exec( value ) ) &&
    				( matches[ 3 ] || "px" ) !== "px" ) {

    				elem.style[ dimension ] = value;
    				value = jQuery.css( elem, dimension );
    			}

    			return setPositiveNumber( elem, value, subtract );
    		}
    	};
    } );

    jQuery.cssHooks.marginLeft = addGetHookIf( support.reliableMarginLeft,
    	function( elem, computed ) {
    		if ( computed ) {
    			return ( parseFloat( curCSS( elem, "marginLeft" ) ) ||
    				elem.getBoundingClientRect().left -
    					swap( elem, { marginLeft: 0 }, function() {
    						return elem.getBoundingClientRect().left;
    					} )
    			) + "px";
    		}
    	}
    );

    // These hooks are used by animate to expand properties
    jQuery.each( {
    	margin: "",
    	padding: "",
    	border: "Width"
    }, function( prefix, suffix ) {
    	jQuery.cssHooks[ prefix + suffix ] = {
    		expand: function( value ) {
    			var i = 0,
    				expanded = {},

    				// Assumes a single number if not a string
    				parts = typeof value === "string" ? value.split( " " ) : [ value ];

    			for ( ; i < 4; i++ ) {
    				expanded[ prefix + cssExpand[ i ] + suffix ] =
    					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
    			}

    			return expanded;
    		}
    	};

    	if ( prefix !== "margin" ) {
    		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
    	}
    } );

    jQuery.fn.extend( {
    	css: function( name, value ) {
    		return access( this, function( elem, name, value ) {
    			var styles, len,
    				map = {},
    				i = 0;

    			if ( Array.isArray( name ) ) {
    				styles = getStyles( elem );
    				len = name.length;

    				for ( ; i < len; i++ ) {
    					map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
    				}

    				return map;
    			}

    			return value !== undefined ?
    				jQuery.style( elem, name, value ) :
    				jQuery.css( elem, name );
    		}, name, value, arguments.length > 1 );
    	}
    } );


    function Tween( elem, options, prop, end, easing ) {
    	return new Tween.prototype.init( elem, options, prop, end, easing );
    }
    jQuery.Tween = Tween;

    Tween.prototype = {
    	constructor: Tween,
    	init: function( elem, options, prop, end, easing, unit ) {
    		this.elem = elem;
    		this.prop = prop;
    		this.easing = easing || jQuery.easing._default;
    		this.options = options;
    		this.start = this.now = this.cur();
    		this.end = end;
    		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
    	},
    	cur: function() {
    		var hooks = Tween.propHooks[ this.prop ];

    		return hooks && hooks.get ?
    			hooks.get( this ) :
    			Tween.propHooks._default.get( this );
    	},
    	run: function( percent ) {
    		var eased,
    			hooks = Tween.propHooks[ this.prop ];

    		if ( this.options.duration ) {
    			this.pos = eased = jQuery.easing[ this.easing ](
    				percent, this.options.duration * percent, 0, 1, this.options.duration
    			);
    		} else {
    			this.pos = eased = percent;
    		}
    		this.now = ( this.end - this.start ) * eased + this.start;

    		if ( this.options.step ) {
    			this.options.step.call( this.elem, this.now, this );
    		}

    		if ( hooks && hooks.set ) {
    			hooks.set( this );
    		} else {
    			Tween.propHooks._default.set( this );
    		}
    		return this;
    	}
    };

    Tween.prototype.init.prototype = Tween.prototype;

    Tween.propHooks = {
    	_default: {
    		get: function( tween ) {
    			var result;

    			// Use a property on the element directly when it is not a DOM element,
    			// or when there is no matching style property that exists.
    			if ( tween.elem.nodeType !== 1 ||
    				tween.elem[ tween.prop ] != null && tween.elem.style[ tween.prop ] == null ) {
    				return tween.elem[ tween.prop ];
    			}

    			// Passing an empty string as a 3rd parameter to .css will automatically
    			// attempt a parseFloat and fallback to a string if the parse fails.
    			// Simple values such as "10px" are parsed to Float;
    			// complex values such as "rotate(1rad)" are returned as-is.
    			result = jQuery.css( tween.elem, tween.prop, "" );

    			// Empty strings, null, undefined and "auto" are converted to 0.
    			return !result || result === "auto" ? 0 : result;
    		},
    		set: function( tween ) {

    			// Use step hook for back compat.
    			// Use cssHook if its there.
    			// Use .style if available and use plain properties where available.
    			if ( jQuery.fx.step[ tween.prop ] ) {
    				jQuery.fx.step[ tween.prop ]( tween );
    			} else if ( tween.elem.nodeType === 1 && (
    				jQuery.cssHooks[ tween.prop ] ||
    					tween.elem.style[ finalPropName( tween.prop ) ] != null ) ) {
    				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
    			} else {
    				tween.elem[ tween.prop ] = tween.now;
    			}
    		}
    	}
    };

    // Support: IE <=9 only
    // Panic based approach to setting things on disconnected nodes
    Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
    	set: function( tween ) {
    		if ( tween.elem.nodeType && tween.elem.parentNode ) {
    			tween.elem[ tween.prop ] = tween.now;
    		}
    	}
    };

    jQuery.easing = {
    	linear: function( p ) {
    		return p;
    	},
    	swing: function( p ) {
    		return 0.5 - Math.cos( p * Math.PI ) / 2;
    	},
    	_default: "swing"
    };

    jQuery.fx = Tween.prototype.init;

    // Back compat <1.8 extension point
    jQuery.fx.step = {};




    var
    	fxNow, inProgress,
    	rfxtypes = /^(?:toggle|show|hide)$/,
    	rrun = /queueHooks$/;

    function schedule() {
    	if ( inProgress ) {
    		if ( document.hidden === false && window.requestAnimationFrame ) {
    			window.requestAnimationFrame( schedule );
    		} else {
    			window.setTimeout( schedule, jQuery.fx.interval );
    		}

    		jQuery.fx.tick();
    	}
    }

    // Animations created synchronously will run synchronously
    function createFxNow() {
    	window.setTimeout( function() {
    		fxNow = undefined;
    	} );
    	return ( fxNow = Date.now() );
    }

    // Generate parameters to create a standard animation
    function genFx( type, includeWidth ) {
    	var which,
    		i = 0,
    		attrs = { height: type };

    	// If we include width, step value is 1 to do all cssExpand values,
    	// otherwise step value is 2 to skip over Left and Right
    	includeWidth = includeWidth ? 1 : 0;
    	for ( ; i < 4; i += 2 - includeWidth ) {
    		which = cssExpand[ i ];
    		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
    	}

    	if ( includeWidth ) {
    		attrs.opacity = attrs.width = type;
    	}

    	return attrs;
    }

    function createTween( value, prop, animation ) {
    	var tween,
    		collection = ( Animation.tweeners[ prop ] || [] ).concat( Animation.tweeners[ "*" ] ),
    		index = 0,
    		length = collection.length;
    	for ( ; index < length; index++ ) {
    		if ( ( tween = collection[ index ].call( animation, prop, value ) ) ) {

    			// We're done with this property
    			return tween;
    		}
    	}
    }

    function defaultPrefilter( elem, props, opts ) {
    	var prop, value, toggle, hooks, oldfire, propTween, restoreDisplay, display,
    		isBox = "width" in props || "height" in props,
    		anim = this,
    		orig = {},
    		style = elem.style,
    		hidden = elem.nodeType && isHiddenWithinTree( elem ),
    		dataShow = dataPriv.get( elem, "fxshow" );

    	// Queue-skipping animations hijack the fx hooks
    	if ( !opts.queue ) {
    		hooks = jQuery._queueHooks( elem, "fx" );
    		if ( hooks.unqueued == null ) {
    			hooks.unqueued = 0;
    			oldfire = hooks.empty.fire;
    			hooks.empty.fire = function() {
    				if ( !hooks.unqueued ) {
    					oldfire();
    				}
    			};
    		}
    		hooks.unqueued++;

    		anim.always( function() {

    			// Ensure the complete handler is called before this completes
    			anim.always( function() {
    				hooks.unqueued--;
    				if ( !jQuery.queue( elem, "fx" ).length ) {
    					hooks.empty.fire();
    				}
    			} );
    		} );
    	}

    	// Detect show/hide animations
    	for ( prop in props ) {
    		value = props[ prop ];
    		if ( rfxtypes.test( value ) ) {
    			delete props[ prop ];
    			toggle = toggle || value === "toggle";
    			if ( value === ( hidden ? "hide" : "show" ) ) {

    				// Pretend to be hidden if this is a "show" and
    				// there is still data from a stopped show/hide
    				if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
    					hidden = true;

    				// Ignore all other no-op show/hide data
    				} else {
    					continue;
    				}
    			}
    			orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );
    		}
    	}

    	// Bail out if this is a no-op like .hide().hide()
    	propTween = !jQuery.isEmptyObject( props );
    	if ( !propTween && jQuery.isEmptyObject( orig ) ) {
    		return;
    	}

    	// Restrict "overflow" and "display" styles during box animations
    	if ( isBox && elem.nodeType === 1 ) {

    		// Support: IE <=9 - 11, Edge 12 - 15
    		// Record all 3 overflow attributes because IE does not infer the shorthand
    		// from identically-valued overflowX and overflowY and Edge just mirrors
    		// the overflowX value there.
    		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

    		// Identify a display type, preferring old show/hide data over the CSS cascade
    		restoreDisplay = dataShow && dataShow.display;
    		if ( restoreDisplay == null ) {
    			restoreDisplay = dataPriv.get( elem, "display" );
    		}
    		display = jQuery.css( elem, "display" );
    		if ( display === "none" ) {
    			if ( restoreDisplay ) {
    				display = restoreDisplay;
    			} else {

    				// Get nonempty value(s) by temporarily forcing visibility
    				showHide( [ elem ], true );
    				restoreDisplay = elem.style.display || restoreDisplay;
    				display = jQuery.css( elem, "display" );
    				showHide( [ elem ] );
    			}
    		}

    		// Animate inline elements as inline-block
    		if ( display === "inline" || display === "inline-block" && restoreDisplay != null ) {
    			if ( jQuery.css( elem, "float" ) === "none" ) {

    				// Restore the original display value at the end of pure show/hide animations
    				if ( !propTween ) {
    					anim.done( function() {
    						style.display = restoreDisplay;
    					} );
    					if ( restoreDisplay == null ) {
    						display = style.display;
    						restoreDisplay = display === "none" ? "" : display;
    					}
    				}
    				style.display = "inline-block";
    			}
    		}
    	}

    	if ( opts.overflow ) {
    		style.overflow = "hidden";
    		anim.always( function() {
    			style.overflow = opts.overflow[ 0 ];
    			style.overflowX = opts.overflow[ 1 ];
    			style.overflowY = opts.overflow[ 2 ];
    		} );
    	}

    	// Implement show/hide animations
    	propTween = false;
    	for ( prop in orig ) {

    		// General show/hide setup for this element animation
    		if ( !propTween ) {
    			if ( dataShow ) {
    				if ( "hidden" in dataShow ) {
    					hidden = dataShow.hidden;
    				}
    			} else {
    				dataShow = dataPriv.access( elem, "fxshow", { display: restoreDisplay } );
    			}

    			// Store hidden/visible for toggle so `.stop().toggle()` "reverses"
    			if ( toggle ) {
    				dataShow.hidden = !hidden;
    			}

    			// Show elements before animating them
    			if ( hidden ) {
    				showHide( [ elem ], true );
    			}

    			/* eslint-disable no-loop-func */

    			anim.done( function() {

    				/* eslint-enable no-loop-func */

    				// The final step of a "hide" animation is actually hiding the element
    				if ( !hidden ) {
    					showHide( [ elem ] );
    				}
    				dataPriv.remove( elem, "fxshow" );
    				for ( prop in orig ) {
    					jQuery.style( elem, prop, orig[ prop ] );
    				}
    			} );
    		}

    		// Per-property setup
    		propTween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );
    		if ( !( prop in dataShow ) ) {
    			dataShow[ prop ] = propTween.start;
    			if ( hidden ) {
    				propTween.end = propTween.start;
    				propTween.start = 0;
    			}
    		}
    	}
    }

    function propFilter( props, specialEasing ) {
    	var index, name, easing, value, hooks;

    	// camelCase, specialEasing and expand cssHook pass
    	for ( index in props ) {
    		name = camelCase( index );
    		easing = specialEasing[ name ];
    		value = props[ index ];
    		if ( Array.isArray( value ) ) {
    			easing = value[ 1 ];
    			value = props[ index ] = value[ 0 ];
    		}

    		if ( index !== name ) {
    			props[ name ] = value;
    			delete props[ index ];
    		}

    		hooks = jQuery.cssHooks[ name ];
    		if ( hooks && "expand" in hooks ) {
    			value = hooks.expand( value );
    			delete props[ name ];

    			// Not quite $.extend, this won't overwrite existing keys.
    			// Reusing 'index' because we have the correct "name"
    			for ( index in value ) {
    				if ( !( index in props ) ) {
    					props[ index ] = value[ index ];
    					specialEasing[ index ] = easing;
    				}
    			}
    		} else {
    			specialEasing[ name ] = easing;
    		}
    	}
    }

    function Animation( elem, properties, options ) {
    	var result,
    		stopped,
    		index = 0,
    		length = Animation.prefilters.length,
    		deferred = jQuery.Deferred().always( function() {

    			// Don't match elem in the :animated selector
    			delete tick.elem;
    		} ),
    		tick = function() {
    			if ( stopped ) {
    				return false;
    			}
    			var currentTime = fxNow || createFxNow(),
    				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),

    				// Support: Android 2.3 only
    				// Archaic crash bug won't allow us to use `1 - ( 0.5 || 0 )` (#12497)
    				temp = remaining / animation.duration || 0,
    				percent = 1 - temp,
    				index = 0,
    				length = animation.tweens.length;

    			for ( ; index < length; index++ ) {
    				animation.tweens[ index ].run( percent );
    			}

    			deferred.notifyWith( elem, [ animation, percent, remaining ] );

    			// If there's more to do, yield
    			if ( percent < 1 && length ) {
    				return remaining;
    			}

    			// If this was an empty animation, synthesize a final progress notification
    			if ( !length ) {
    				deferred.notifyWith( elem, [ animation, 1, 0 ] );
    			}

    			// Resolve the animation and report its conclusion
    			deferred.resolveWith( elem, [ animation ] );
    			return false;
    		},
    		animation = deferred.promise( {
    			elem: elem,
    			props: jQuery.extend( {}, properties ),
    			opts: jQuery.extend( true, {
    				specialEasing: {},
    				easing: jQuery.easing._default
    			}, options ),
    			originalProperties: properties,
    			originalOptions: options,
    			startTime: fxNow || createFxNow(),
    			duration: options.duration,
    			tweens: [],
    			createTween: function( prop, end ) {
    				var tween = jQuery.Tween( elem, animation.opts, prop, end,
    					animation.opts.specialEasing[ prop ] || animation.opts.easing );
    				animation.tweens.push( tween );
    				return tween;
    			},
    			stop: function( gotoEnd ) {
    				var index = 0,

    					// If we are going to the end, we want to run all the tweens
    					// otherwise we skip this part
    					length = gotoEnd ? animation.tweens.length : 0;
    				if ( stopped ) {
    					return this;
    				}
    				stopped = true;
    				for ( ; index < length; index++ ) {
    					animation.tweens[ index ].run( 1 );
    				}

    				// Resolve when we played the last frame; otherwise, reject
    				if ( gotoEnd ) {
    					deferred.notifyWith( elem, [ animation, 1, 0 ] );
    					deferred.resolveWith( elem, [ animation, gotoEnd ] );
    				} else {
    					deferred.rejectWith( elem, [ animation, gotoEnd ] );
    				}
    				return this;
    			}
    		} ),
    		props = animation.props;

    	propFilter( props, animation.opts.specialEasing );

    	for ( ; index < length; index++ ) {
    		result = Animation.prefilters[ index ].call( animation, elem, props, animation.opts );
    		if ( result ) {
    			if ( isFunction( result.stop ) ) {
    				jQuery._queueHooks( animation.elem, animation.opts.queue ).stop =
    					result.stop.bind( result );
    			}
    			return result;
    		}
    	}

    	jQuery.map( props, createTween, animation );

    	if ( isFunction( animation.opts.start ) ) {
    		animation.opts.start.call( elem, animation );
    	}

    	// Attach callbacks from options
    	animation
    		.progress( animation.opts.progress )
    		.done( animation.opts.done, animation.opts.complete )
    		.fail( animation.opts.fail )
    		.always( animation.opts.always );

    	jQuery.fx.timer(
    		jQuery.extend( tick, {
    			elem: elem,
    			anim: animation,
    			queue: animation.opts.queue
    		} )
    	);

    	return animation;
    }

    jQuery.Animation = jQuery.extend( Animation, {

    	tweeners: {
    		"*": [ function( prop, value ) {
    			var tween = this.createTween( prop, value );
    			adjustCSS( tween.elem, prop, rcssNum.exec( value ), tween );
    			return tween;
    		} ]
    	},

    	tweener: function( props, callback ) {
    		if ( isFunction( props ) ) {
    			callback = props;
    			props = [ "*" ];
    		} else {
    			props = props.match( rnothtmlwhite );
    		}

    		var prop,
    			index = 0,
    			length = props.length;

    		for ( ; index < length; index++ ) {
    			prop = props[ index ];
    			Animation.tweeners[ prop ] = Animation.tweeners[ prop ] || [];
    			Animation.tweeners[ prop ].unshift( callback );
    		}
    	},

    	prefilters: [ defaultPrefilter ],

    	prefilter: function( callback, prepend ) {
    		if ( prepend ) {
    			Animation.prefilters.unshift( callback );
    		} else {
    			Animation.prefilters.push( callback );
    		}
    	}
    } );

    jQuery.speed = function( speed, easing, fn ) {
    	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
    		complete: fn || !fn && easing ||
    			isFunction( speed ) && speed,
    		duration: speed,
    		easing: fn && easing || easing && !isFunction( easing ) && easing
    	};

    	// Go to the end state if fx are off
    	if ( jQuery.fx.off ) {
    		opt.duration = 0;

    	} else {
    		if ( typeof opt.duration !== "number" ) {
    			if ( opt.duration in jQuery.fx.speeds ) {
    				opt.duration = jQuery.fx.speeds[ opt.duration ];

    			} else {
    				opt.duration = jQuery.fx.speeds._default;
    			}
    		}
    	}

    	// Normalize opt.queue - true/undefined/null -> "fx"
    	if ( opt.queue == null || opt.queue === true ) {
    		opt.queue = "fx";
    	}

    	// Queueing
    	opt.old = opt.complete;

    	opt.complete = function() {
    		if ( isFunction( opt.old ) ) {
    			opt.old.call( this );
    		}

    		if ( opt.queue ) {
    			jQuery.dequeue( this, opt.queue );
    		}
    	};

    	return opt;
    };

    jQuery.fn.extend( {
    	fadeTo: function( speed, to, easing, callback ) {

    		// Show any hidden elements after setting opacity to 0
    		return this.filter( isHiddenWithinTree ).css( "opacity", 0 ).show()

    			// Animate to the value specified
    			.end().animate( { opacity: to }, speed, easing, callback );
    	},
    	animate: function( prop, speed, easing, callback ) {
    		var empty = jQuery.isEmptyObject( prop ),
    			optall = jQuery.speed( speed, easing, callback ),
    			doAnimation = function() {

    				// Operate on a copy of prop so per-property easing won't be lost
    				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

    				// Empty animations, or finishing resolves immediately
    				if ( empty || dataPriv.get( this, "finish" ) ) {
    					anim.stop( true );
    				}
    			};

    		doAnimation.finish = doAnimation;

    		return empty || optall.queue === false ?
    			this.each( doAnimation ) :
    			this.queue( optall.queue, doAnimation );
    	},
    	stop: function( type, clearQueue, gotoEnd ) {
    		var stopQueue = function( hooks ) {
    			var stop = hooks.stop;
    			delete hooks.stop;
    			stop( gotoEnd );
    		};

    		if ( typeof type !== "string" ) {
    			gotoEnd = clearQueue;
    			clearQueue = type;
    			type = undefined;
    		}
    		if ( clearQueue ) {
    			this.queue( type || "fx", [] );
    		}

    		return this.each( function() {
    			var dequeue = true,
    				index = type != null && type + "queueHooks",
    				timers = jQuery.timers,
    				data = dataPriv.get( this );

    			if ( index ) {
    				if ( data[ index ] && data[ index ].stop ) {
    					stopQueue( data[ index ] );
    				}
    			} else {
    				for ( index in data ) {
    					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
    						stopQueue( data[ index ] );
    					}
    				}
    			}

    			for ( index = timers.length; index--; ) {
    				if ( timers[ index ].elem === this &&
    					( type == null || timers[ index ].queue === type ) ) {

    					timers[ index ].anim.stop( gotoEnd );
    					dequeue = false;
    					timers.splice( index, 1 );
    				}
    			}

    			// Start the next in the queue if the last step wasn't forced.
    			// Timers currently will call their complete callbacks, which
    			// will dequeue but only if they were gotoEnd.
    			if ( dequeue || !gotoEnd ) {
    				jQuery.dequeue( this, type );
    			}
    		} );
    	},
    	finish: function( type ) {
    		if ( type !== false ) {
    			type = type || "fx";
    		}
    		return this.each( function() {
    			var index,
    				data = dataPriv.get( this ),
    				queue = data[ type + "queue" ],
    				hooks = data[ type + "queueHooks" ],
    				timers = jQuery.timers,
    				length = queue ? queue.length : 0;

    			// Enable finishing flag on private data
    			data.finish = true;

    			// Empty the queue first
    			jQuery.queue( this, type, [] );

    			if ( hooks && hooks.stop ) {
    				hooks.stop.call( this, true );
    			}

    			// Look for any active animations, and finish them
    			for ( index = timers.length; index--; ) {
    				if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
    					timers[ index ].anim.stop( true );
    					timers.splice( index, 1 );
    				}
    			}

    			// Look for any animations in the old queue and finish them
    			for ( index = 0; index < length; index++ ) {
    				if ( queue[ index ] && queue[ index ].finish ) {
    					queue[ index ].finish.call( this );
    				}
    			}

    			// Turn off finishing flag
    			delete data.finish;
    		} );
    	}
    } );

    jQuery.each( [ "toggle", "show", "hide" ], function( _i, name ) {
    	var cssFn = jQuery.fn[ name ];
    	jQuery.fn[ name ] = function( speed, easing, callback ) {
    		return speed == null || typeof speed === "boolean" ?
    			cssFn.apply( this, arguments ) :
    			this.animate( genFx( name, true ), speed, easing, callback );
    	};
    } );

    // Generate shortcuts for custom animations
    jQuery.each( {
    	slideDown: genFx( "show" ),
    	slideUp: genFx( "hide" ),
    	slideToggle: genFx( "toggle" ),
    	fadeIn: { opacity: "show" },
    	fadeOut: { opacity: "hide" },
    	fadeToggle: { opacity: "toggle" }
    }, function( name, props ) {
    	jQuery.fn[ name ] = function( speed, easing, callback ) {
    		return this.animate( props, speed, easing, callback );
    	};
    } );

    jQuery.timers = [];
    jQuery.fx.tick = function() {
    	var timer,
    		i = 0,
    		timers = jQuery.timers;

    	fxNow = Date.now();

    	for ( ; i < timers.length; i++ ) {
    		timer = timers[ i ];

    		// Run the timer and safely remove it when done (allowing for external removal)
    		if ( !timer() && timers[ i ] === timer ) {
    			timers.splice( i--, 1 );
    		}
    	}

    	if ( !timers.length ) {
    		jQuery.fx.stop();
    	}
    	fxNow = undefined;
    };

    jQuery.fx.timer = function( timer ) {
    	jQuery.timers.push( timer );
    	jQuery.fx.start();
    };

    jQuery.fx.interval = 13;
    jQuery.fx.start = function() {
    	if ( inProgress ) {
    		return;
    	}

    	inProgress = true;
    	schedule();
    };

    jQuery.fx.stop = function() {
    	inProgress = null;
    };

    jQuery.fx.speeds = {
    	slow: 600,
    	fast: 200,

    	// Default speed
    	_default: 400
    };


    // Based off of the plugin by Clint Helfers, with permission.
    // https://web.archive.org/web/20100324014747/http://blindsignals.com/index.php/2009/07/jquery-delay/
    jQuery.fn.delay = function( time, type ) {
    	time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
    	type = type || "fx";

    	return this.queue( type, function( next, hooks ) {
    		var timeout = window.setTimeout( next, time );
    		hooks.stop = function() {
    			window.clearTimeout( timeout );
    		};
    	} );
    };


    ( function() {
    	var input = document.createElement( "input" ),
    		select = document.createElement( "select" ),
    		opt = select.appendChild( document.createElement( "option" ) );

    	input.type = "checkbox";

    	// Support: Android <=4.3 only
    	// Default value for a checkbox should be "on"
    	support.checkOn = input.value !== "";

    	// Support: IE <=11 only
    	// Must access selectedIndex to make default options select
    	support.optSelected = opt.selected;

    	// Support: IE <=11 only
    	// An input loses its value after becoming a radio
    	input = document.createElement( "input" );
    	input.value = "t";
    	input.type = "radio";
    	support.radioValue = input.value === "t";
    } )();


    var boolHook,
    	attrHandle = jQuery.expr.attrHandle;

    jQuery.fn.extend( {
    	attr: function( name, value ) {
    		return access( this, jQuery.attr, name, value, arguments.length > 1 );
    	},

    	removeAttr: function( name ) {
    		return this.each( function() {
    			jQuery.removeAttr( this, name );
    		} );
    	}
    } );

    jQuery.extend( {
    	attr: function( elem, name, value ) {
    		var ret, hooks,
    			nType = elem.nodeType;

    		// Don't get/set attributes on text, comment and attribute nodes
    		if ( nType === 3 || nType === 8 || nType === 2 ) {
    			return;
    		}

    		// Fallback to prop when attributes are not supported
    		if ( typeof elem.getAttribute === "undefined" ) {
    			return jQuery.prop( elem, name, value );
    		}

    		// Attribute hooks are determined by the lowercase version
    		// Grab necessary hook if one is defined
    		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
    			hooks = jQuery.attrHooks[ name.toLowerCase() ] ||
    				( jQuery.expr.match.bool.test( name ) ? boolHook : undefined );
    		}

    		if ( value !== undefined ) {
    			if ( value === null ) {
    				jQuery.removeAttr( elem, name );
    				return;
    			}

    			if ( hooks && "set" in hooks &&
    				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
    				return ret;
    			}

    			elem.setAttribute( name, value + "" );
    			return value;
    		}

    		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
    			return ret;
    		}

    		ret = jQuery.find.attr( elem, name );

    		// Non-existent attributes return null, we normalize to undefined
    		return ret == null ? undefined : ret;
    	},

    	attrHooks: {
    		type: {
    			set: function( elem, value ) {
    				if ( !support.radioValue && value === "radio" &&
    					nodeName( elem, "input" ) ) {
    					var val = elem.value;
    					elem.setAttribute( "type", value );
    					if ( val ) {
    						elem.value = val;
    					}
    					return value;
    				}
    			}
    		}
    	},

    	removeAttr: function( elem, value ) {
    		var name,
    			i = 0,

    			// Attribute names can contain non-HTML whitespace characters
    			// https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
    			attrNames = value && value.match( rnothtmlwhite );

    		if ( attrNames && elem.nodeType === 1 ) {
    			while ( ( name = attrNames[ i++ ] ) ) {
    				elem.removeAttribute( name );
    			}
    		}
    	}
    } );

    // Hooks for boolean attributes
    boolHook = {
    	set: function( elem, value, name ) {
    		if ( value === false ) {

    			// Remove boolean attributes when set to false
    			jQuery.removeAttr( elem, name );
    		} else {
    			elem.setAttribute( name, name );
    		}
    		return name;
    	}
    };

    jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( _i, name ) {
    	var getter = attrHandle[ name ] || jQuery.find.attr;

    	attrHandle[ name ] = function( elem, name, isXML ) {
    		var ret, handle,
    			lowercaseName = name.toLowerCase();

    		if ( !isXML ) {

    			// Avoid an infinite loop by temporarily removing this function from the getter
    			handle = attrHandle[ lowercaseName ];
    			attrHandle[ lowercaseName ] = ret;
    			ret = getter( elem, name, isXML ) != null ?
    				lowercaseName :
    				null;
    			attrHandle[ lowercaseName ] = handle;
    		}
    		return ret;
    	};
    } );




    var rfocusable = /^(?:input|select|textarea|button)$/i,
    	rclickable = /^(?:a|area)$/i;

    jQuery.fn.extend( {
    	prop: function( name, value ) {
    		return access( this, jQuery.prop, name, value, arguments.length > 1 );
    	},

    	removeProp: function( name ) {
    		return this.each( function() {
    			delete this[ jQuery.propFix[ name ] || name ];
    		} );
    	}
    } );

    jQuery.extend( {
    	prop: function( elem, name, value ) {
    		var ret, hooks,
    			nType = elem.nodeType;

    		// Don't get/set properties on text, comment and attribute nodes
    		if ( nType === 3 || nType === 8 || nType === 2 ) {
    			return;
    		}

    		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {

    			// Fix name and attach hooks
    			name = jQuery.propFix[ name ] || name;
    			hooks = jQuery.propHooks[ name ];
    		}

    		if ( value !== undefined ) {
    			if ( hooks && "set" in hooks &&
    				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
    				return ret;
    			}

    			return ( elem[ name ] = value );
    		}

    		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
    			return ret;
    		}

    		return elem[ name ];
    	},

    	propHooks: {
    		tabIndex: {
    			get: function( elem ) {

    				// Support: IE <=9 - 11 only
    				// elem.tabIndex doesn't always return the
    				// correct value when it hasn't been explicitly set
    				// https://web.archive.org/web/20141116233347/http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
    				// Use proper attribute retrieval(#12072)
    				var tabindex = jQuery.find.attr( elem, "tabindex" );

    				if ( tabindex ) {
    					return parseInt( tabindex, 10 );
    				}

    				if (
    					rfocusable.test( elem.nodeName ) ||
    					rclickable.test( elem.nodeName ) &&
    					elem.href
    				) {
    					return 0;
    				}

    				return -1;
    			}
    		}
    	},

    	propFix: {
    		"for": "htmlFor",
    		"class": "className"
    	}
    } );

    // Support: IE <=11 only
    // Accessing the selectedIndex property
    // forces the browser to respect setting selected
    // on the option
    // The getter ensures a default option is selected
    // when in an optgroup
    // eslint rule "no-unused-expressions" is disabled for this code
    // since it considers such accessions noop
    if ( !support.optSelected ) {
    	jQuery.propHooks.selected = {
    		get: function( elem ) {

    			/* eslint no-unused-expressions: "off" */

    			var parent = elem.parentNode;
    			if ( parent && parent.parentNode ) {
    				parent.parentNode.selectedIndex;
    			}
    			return null;
    		},
    		set: function( elem ) {

    			/* eslint no-unused-expressions: "off" */

    			var parent = elem.parentNode;
    			if ( parent ) {
    				parent.selectedIndex;

    				if ( parent.parentNode ) {
    					parent.parentNode.selectedIndex;
    				}
    			}
    		}
    	};
    }

    jQuery.each( [
    	"tabIndex",
    	"readOnly",
    	"maxLength",
    	"cellSpacing",
    	"cellPadding",
    	"rowSpan",
    	"colSpan",
    	"useMap",
    	"frameBorder",
    	"contentEditable"
    ], function() {
    	jQuery.propFix[ this.toLowerCase() ] = this;
    } );




    	// Strip and collapse whitespace according to HTML spec
    	// https://infra.spec.whatwg.org/#strip-and-collapse-ascii-whitespace
    	function stripAndCollapse( value ) {
    		var tokens = value.match( rnothtmlwhite ) || [];
    		return tokens.join( " " );
    	}


    function getClass( elem ) {
    	return elem.getAttribute && elem.getAttribute( "class" ) || "";
    }

    function classesToArray( value ) {
    	if ( Array.isArray( value ) ) {
    		return value;
    	}
    	if ( typeof value === "string" ) {
    		return value.match( rnothtmlwhite ) || [];
    	}
    	return [];
    }

    jQuery.fn.extend( {
    	addClass: function( value ) {
    		var classes, elem, cur, curValue, clazz, j, finalValue,
    			i = 0;

    		if ( isFunction( value ) ) {
    			return this.each( function( j ) {
    				jQuery( this ).addClass( value.call( this, j, getClass( this ) ) );
    			} );
    		}

    		classes = classesToArray( value );

    		if ( classes.length ) {
    			while ( ( elem = this[ i++ ] ) ) {
    				curValue = getClass( elem );
    				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

    				if ( cur ) {
    					j = 0;
    					while ( ( clazz = classes[ j++ ] ) ) {
    						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
    							cur += clazz + " ";
    						}
    					}

    					// Only assign if different to avoid unneeded rendering.
    					finalValue = stripAndCollapse( cur );
    					if ( curValue !== finalValue ) {
    						elem.setAttribute( "class", finalValue );
    					}
    				}
    			}
    		}

    		return this;
    	},

    	removeClass: function( value ) {
    		var classes, elem, cur, curValue, clazz, j, finalValue,
    			i = 0;

    		if ( isFunction( value ) ) {
    			return this.each( function( j ) {
    				jQuery( this ).removeClass( value.call( this, j, getClass( this ) ) );
    			} );
    		}

    		if ( !arguments.length ) {
    			return this.attr( "class", "" );
    		}

    		classes = classesToArray( value );

    		if ( classes.length ) {
    			while ( ( elem = this[ i++ ] ) ) {
    				curValue = getClass( elem );

    				// This expression is here for better compressibility (see addClass)
    				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

    				if ( cur ) {
    					j = 0;
    					while ( ( clazz = classes[ j++ ] ) ) {

    						// Remove *all* instances
    						while ( cur.indexOf( " " + clazz + " " ) > -1 ) {
    							cur = cur.replace( " " + clazz + " ", " " );
    						}
    					}

    					// Only assign if different to avoid unneeded rendering.
    					finalValue = stripAndCollapse( cur );
    					if ( curValue !== finalValue ) {
    						elem.setAttribute( "class", finalValue );
    					}
    				}
    			}
    		}

    		return this;
    	},

    	toggleClass: function( value, stateVal ) {
    		var type = typeof value,
    			isValidValue = type === "string" || Array.isArray( value );

    		if ( typeof stateVal === "boolean" && isValidValue ) {
    			return stateVal ? this.addClass( value ) : this.removeClass( value );
    		}

    		if ( isFunction( value ) ) {
    			return this.each( function( i ) {
    				jQuery( this ).toggleClass(
    					value.call( this, i, getClass( this ), stateVal ),
    					stateVal
    				);
    			} );
    		}

    		return this.each( function() {
    			var className, i, self, classNames;

    			if ( isValidValue ) {

    				// Toggle individual class names
    				i = 0;
    				self = jQuery( this );
    				classNames = classesToArray( value );

    				while ( ( className = classNames[ i++ ] ) ) {

    					// Check each className given, space separated list
    					if ( self.hasClass( className ) ) {
    						self.removeClass( className );
    					} else {
    						self.addClass( className );
    					}
    				}

    			// Toggle whole class name
    			} else if ( value === undefined || type === "boolean" ) {
    				className = getClass( this );
    				if ( className ) {

    					// Store className if set
    					dataPriv.set( this, "__className__", className );
    				}

    				// If the element has a class name or if we're passed `false`,
    				// then remove the whole classname (if there was one, the above saved it).
    				// Otherwise bring back whatever was previously saved (if anything),
    				// falling back to the empty string if nothing was stored.
    				if ( this.setAttribute ) {
    					this.setAttribute( "class",
    						className || value === false ?
    							"" :
    							dataPriv.get( this, "__className__" ) || ""
    					);
    				}
    			}
    		} );
    	},

    	hasClass: function( selector ) {
    		var className, elem,
    			i = 0;

    		className = " " + selector + " ";
    		while ( ( elem = this[ i++ ] ) ) {
    			if ( elem.nodeType === 1 &&
    				( " " + stripAndCollapse( getClass( elem ) ) + " " ).indexOf( className ) > -1 ) {
    				return true;
    			}
    		}

    		return false;
    	}
    } );




    var rreturn = /\r/g;

    jQuery.fn.extend( {
    	val: function( value ) {
    		var hooks, ret, valueIsFunction,
    			elem = this[ 0 ];

    		if ( !arguments.length ) {
    			if ( elem ) {
    				hooks = jQuery.valHooks[ elem.type ] ||
    					jQuery.valHooks[ elem.nodeName.toLowerCase() ];

    				if ( hooks &&
    					"get" in hooks &&
    					( ret = hooks.get( elem, "value" ) ) !== undefined
    				) {
    					return ret;
    				}

    				ret = elem.value;

    				// Handle most common string cases
    				if ( typeof ret === "string" ) {
    					return ret.replace( rreturn, "" );
    				}

    				// Handle cases where value is null/undef or number
    				return ret == null ? "" : ret;
    			}

    			return;
    		}

    		valueIsFunction = isFunction( value );

    		return this.each( function( i ) {
    			var val;

    			if ( this.nodeType !== 1 ) {
    				return;
    			}

    			if ( valueIsFunction ) {
    				val = value.call( this, i, jQuery( this ).val() );
    			} else {
    				val = value;
    			}

    			// Treat null/undefined as ""; convert numbers to string
    			if ( val == null ) {
    				val = "";

    			} else if ( typeof val === "number" ) {
    				val += "";

    			} else if ( Array.isArray( val ) ) {
    				val = jQuery.map( val, function( value ) {
    					return value == null ? "" : value + "";
    				} );
    			}

    			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

    			// If set returns undefined, fall back to normal setting
    			if ( !hooks || !( "set" in hooks ) || hooks.set( this, val, "value" ) === undefined ) {
    				this.value = val;
    			}
    		} );
    	}
    } );

    jQuery.extend( {
    	valHooks: {
    		option: {
    			get: function( elem ) {

    				var val = jQuery.find.attr( elem, "value" );
    				return val != null ?
    					val :

    					// Support: IE <=10 - 11 only
    					// option.text throws exceptions (#14686, #14858)
    					// Strip and collapse whitespace
    					// https://html.spec.whatwg.org/#strip-and-collapse-whitespace
    					stripAndCollapse( jQuery.text( elem ) );
    			}
    		},
    		select: {
    			get: function( elem ) {
    				var value, option, i,
    					options = elem.options,
    					index = elem.selectedIndex,
    					one = elem.type === "select-one",
    					values = one ? null : [],
    					max = one ? index + 1 : options.length;

    				if ( index < 0 ) {
    					i = max;

    				} else {
    					i = one ? index : 0;
    				}

    				// Loop through all the selected options
    				for ( ; i < max; i++ ) {
    					option = options[ i ];

    					// Support: IE <=9 only
    					// IE8-9 doesn't update selected after form reset (#2551)
    					if ( ( option.selected || i === index ) &&

    							// Don't return options that are disabled or in a disabled optgroup
    							!option.disabled &&
    							( !option.parentNode.disabled ||
    								!nodeName( option.parentNode, "optgroup" ) ) ) {

    						// Get the specific value for the option
    						value = jQuery( option ).val();

    						// We don't need an array for one selects
    						if ( one ) {
    							return value;
    						}

    						// Multi-Selects return an array
    						values.push( value );
    					}
    				}

    				return values;
    			},

    			set: function( elem, value ) {
    				var optionSet, option,
    					options = elem.options,
    					values = jQuery.makeArray( value ),
    					i = options.length;

    				while ( i-- ) {
    					option = options[ i ];

    					/* eslint-disable no-cond-assign */

    					if ( option.selected =
    						jQuery.inArray( jQuery.valHooks.option.get( option ), values ) > -1
    					) {
    						optionSet = true;
    					}

    					/* eslint-enable no-cond-assign */
    				}

    				// Force browsers to behave consistently when non-matching value is set
    				if ( !optionSet ) {
    					elem.selectedIndex = -1;
    				}
    				return values;
    			}
    		}
    	}
    } );

    // Radios and checkboxes getter/setter
    jQuery.each( [ "radio", "checkbox" ], function() {
    	jQuery.valHooks[ this ] = {
    		set: function( elem, value ) {
    			if ( Array.isArray( value ) ) {
    				return ( elem.checked = jQuery.inArray( jQuery( elem ).val(), value ) > -1 );
    			}
    		}
    	};
    	if ( !support.checkOn ) {
    		jQuery.valHooks[ this ].get = function( elem ) {
    			return elem.getAttribute( "value" ) === null ? "on" : elem.value;
    		};
    	}
    } );




    // Return jQuery for attributes-only inclusion


    support.focusin = "onfocusin" in window;


    var rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
    	stopPropagationCallback = function( e ) {
    		e.stopPropagation();
    	};

    jQuery.extend( jQuery.event, {

    	trigger: function( event, data, elem, onlyHandlers ) {

    		var i, cur, tmp, bubbleType, ontype, handle, special, lastElement,
    			eventPath = [ elem || document ],
    			type = hasOwn.call( event, "type" ) ? event.type : event,
    			namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split( "." ) : [];

    		cur = lastElement = tmp = elem = elem || document;

    		// Don't do events on text and comment nodes
    		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
    			return;
    		}

    		// focus/blur morphs to focusin/out; ensure we're not firing them right now
    		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
    			return;
    		}

    		if ( type.indexOf( "." ) > -1 ) {

    			// Namespaced trigger; create a regexp to match event type in handle()
    			namespaces = type.split( "." );
    			type = namespaces.shift();
    			namespaces.sort();
    		}
    		ontype = type.indexOf( ":" ) < 0 && "on" + type;

    		// Caller can pass in a jQuery.Event object, Object, or just an event type string
    		event = event[ jQuery.expando ] ?
    			event :
    			new jQuery.Event( type, typeof event === "object" && event );

    		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
    		event.isTrigger = onlyHandlers ? 2 : 3;
    		event.namespace = namespaces.join( "." );
    		event.rnamespace = event.namespace ?
    			new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" ) :
    			null;

    		// Clean up the event in case it is being reused
    		event.result = undefined;
    		if ( !event.target ) {
    			event.target = elem;
    		}

    		// Clone any incoming data and prepend the event, creating the handler arg list
    		data = data == null ?
    			[ event ] :
    			jQuery.makeArray( data, [ event ] );

    		// Allow special events to draw outside the lines
    		special = jQuery.event.special[ type ] || {};
    		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
    			return;
    		}

    		// Determine event propagation path in advance, per W3C events spec (#9951)
    		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
    		if ( !onlyHandlers && !special.noBubble && !isWindow( elem ) ) {

    			bubbleType = special.delegateType || type;
    			if ( !rfocusMorph.test( bubbleType + type ) ) {
    				cur = cur.parentNode;
    			}
    			for ( ; cur; cur = cur.parentNode ) {
    				eventPath.push( cur );
    				tmp = cur;
    			}

    			// Only add window if we got to document (e.g., not plain obj or detached DOM)
    			if ( tmp === ( elem.ownerDocument || document ) ) {
    				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
    			}
    		}

    		// Fire handlers on the event path
    		i = 0;
    		while ( ( cur = eventPath[ i++ ] ) && !event.isPropagationStopped() ) {
    			lastElement = cur;
    			event.type = i > 1 ?
    				bubbleType :
    				special.bindType || type;

    			// jQuery handler
    			handle = ( dataPriv.get( cur, "events" ) || Object.create( null ) )[ event.type ] &&
    				dataPriv.get( cur, "handle" );
    			if ( handle ) {
    				handle.apply( cur, data );
    			}

    			// Native handler
    			handle = ontype && cur[ ontype ];
    			if ( handle && handle.apply && acceptData( cur ) ) {
    				event.result = handle.apply( cur, data );
    				if ( event.result === false ) {
    					event.preventDefault();
    				}
    			}
    		}
    		event.type = type;

    		// If nobody prevented the default action, do it now
    		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

    			if ( ( !special._default ||
    				special._default.apply( eventPath.pop(), data ) === false ) &&
    				acceptData( elem ) ) {

    				// Call a native DOM method on the target with the same name as the event.
    				// Don't do default actions on window, that's where global variables be (#6170)
    				if ( ontype && isFunction( elem[ type ] ) && !isWindow( elem ) ) {

    					// Don't re-trigger an onFOO event when we call its FOO() method
    					tmp = elem[ ontype ];

    					if ( tmp ) {
    						elem[ ontype ] = null;
    					}

    					// Prevent re-triggering of the same event, since we already bubbled it above
    					jQuery.event.triggered = type;

    					if ( event.isPropagationStopped() ) {
    						lastElement.addEventListener( type, stopPropagationCallback );
    					}

    					elem[ type ]();

    					if ( event.isPropagationStopped() ) {
    						lastElement.removeEventListener( type, stopPropagationCallback );
    					}

    					jQuery.event.triggered = undefined;

    					if ( tmp ) {
    						elem[ ontype ] = tmp;
    					}
    				}
    			}
    		}

    		return event.result;
    	},

    	// Piggyback on a donor event to simulate a different one
    	// Used only for `focus(in | out)` events
    	simulate: function( type, elem, event ) {
    		var e = jQuery.extend(
    			new jQuery.Event(),
    			event,
    			{
    				type: type,
    				isSimulated: true
    			}
    		);

    		jQuery.event.trigger( e, null, elem );
    	}

    } );

    jQuery.fn.extend( {

    	trigger: function( type, data ) {
    		return this.each( function() {
    			jQuery.event.trigger( type, data, this );
    		} );
    	},
    	triggerHandler: function( type, data ) {
    		var elem = this[ 0 ];
    		if ( elem ) {
    			return jQuery.event.trigger( type, data, elem, true );
    		}
    	}
    } );


    // Support: Firefox <=44
    // Firefox doesn't have focus(in | out) events
    // Related ticket - https://bugzilla.mozilla.org/show_bug.cgi?id=687787
    //
    // Support: Chrome <=48 - 49, Safari <=9.0 - 9.1
    // focus(in | out) events fire after focus & blur events,
    // which is spec violation - http://www.w3.org/TR/DOM-Level-3-Events/#events-focusevent-event-order
    // Related ticket - https://bugs.chromium.org/p/chromium/issues/detail?id=449857
    if ( !support.focusin ) {
    	jQuery.each( { focus: "focusin", blur: "focusout" }, function( orig, fix ) {

    		// Attach a single capturing handler on the document while someone wants focusin/focusout
    		var handler = function( event ) {
    			jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ) );
    		};

    		jQuery.event.special[ fix ] = {
    			setup: function() {

    				// Handle: regular nodes (via `this.ownerDocument`), window
    				// (via `this.document`) & document (via `this`).
    				var doc = this.ownerDocument || this.document || this,
    					attaches = dataPriv.access( doc, fix );

    				if ( !attaches ) {
    					doc.addEventListener( orig, handler, true );
    				}
    				dataPriv.access( doc, fix, ( attaches || 0 ) + 1 );
    			},
    			teardown: function() {
    				var doc = this.ownerDocument || this.document || this,
    					attaches = dataPriv.access( doc, fix ) - 1;

    				if ( !attaches ) {
    					doc.removeEventListener( orig, handler, true );
    					dataPriv.remove( doc, fix );

    				} else {
    					dataPriv.access( doc, fix, attaches );
    				}
    			}
    		};
    	} );
    }
    var location = window.location;

    var nonce = { guid: Date.now() };

    var rquery = ( /\?/ );



    // Cross-browser xml parsing
    jQuery.parseXML = function( data ) {
    	var xml, parserErrorElem;
    	if ( !data || typeof data !== "string" ) {
    		return null;
    	}

    	// Support: IE 9 - 11 only
    	// IE throws on parseFromString with invalid input.
    	try {
    		xml = ( new window.DOMParser() ).parseFromString( data, "text/xml" );
    	} catch ( e ) {}

    	parserErrorElem = xml && xml.getElementsByTagName( "parsererror" )[ 0 ];
    	if ( !xml || parserErrorElem ) {
    		jQuery.error( "Invalid XML: " + (
    			parserErrorElem ?
    				jQuery.map( parserErrorElem.childNodes, function( el ) {
    					return el.textContent;
    				} ).join( "\n" ) :
    				data
    		) );
    	}
    	return xml;
    };


    var
    	rbracket = /\[\]$/,
    	rCRLF = /\r?\n/g,
    	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
    	rsubmittable = /^(?:input|select|textarea|keygen)/i;

    function buildParams( prefix, obj, traditional, add ) {
    	var name;

    	if ( Array.isArray( obj ) ) {

    		// Serialize array item.
    		jQuery.each( obj, function( i, v ) {
    			if ( traditional || rbracket.test( prefix ) ) {

    				// Treat each array item as a scalar.
    				add( prefix, v );

    			} else {

    				// Item is non-scalar (array or object), encode its numeric index.
    				buildParams(
    					prefix + "[" + ( typeof v === "object" && v != null ? i : "" ) + "]",
    					v,
    					traditional,
    					add
    				);
    			}
    		} );

    	} else if ( !traditional && toType( obj ) === "object" ) {

    		// Serialize object item.
    		for ( name in obj ) {
    			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
    		}

    	} else {

    		// Serialize scalar item.
    		add( prefix, obj );
    	}
    }

    // Serialize an array of form elements or a set of
    // key/values into a query string
    jQuery.param = function( a, traditional ) {
    	var prefix,
    		s = [],
    		add = function( key, valueOrFunction ) {

    			// If value is a function, invoke it and use its return value
    			var value = isFunction( valueOrFunction ) ?
    				valueOrFunction() :
    				valueOrFunction;

    			s[ s.length ] = encodeURIComponent( key ) + "=" +
    				encodeURIComponent( value == null ? "" : value );
    		};

    	if ( a == null ) {
    		return "";
    	}

    	// If an array was passed in, assume that it is an array of form elements.
    	if ( Array.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {

    		// Serialize the form elements
    		jQuery.each( a, function() {
    			add( this.name, this.value );
    		} );

    	} else {

    		// If traditional, encode the "old" way (the way 1.3.2 or older
    		// did it), otherwise encode params recursively.
    		for ( prefix in a ) {
    			buildParams( prefix, a[ prefix ], traditional, add );
    		}
    	}

    	// Return the resulting serialization
    	return s.join( "&" );
    };

    jQuery.fn.extend( {
    	serialize: function() {
    		return jQuery.param( this.serializeArray() );
    	},
    	serializeArray: function() {
    		return this.map( function() {

    			// Can add propHook for "elements" to filter or add form elements
    			var elements = jQuery.prop( this, "elements" );
    			return elements ? jQuery.makeArray( elements ) : this;
    		} ).filter( function() {
    			var type = this.type;

    			// Use .is( ":disabled" ) so that fieldset[disabled] works
    			return this.name && !jQuery( this ).is( ":disabled" ) &&
    				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
    				( this.checked || !rcheckableType.test( type ) );
    		} ).map( function( _i, elem ) {
    			var val = jQuery( this ).val();

    			if ( val == null ) {
    				return null;
    			}

    			if ( Array.isArray( val ) ) {
    				return jQuery.map( val, function( val ) {
    					return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
    				} );
    			}

    			return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
    		} ).get();
    	}
    } );


    var
    	r20 = /%20/g,
    	rhash = /#.*$/,
    	rantiCache = /([?&])_=[^&]*/,
    	rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,

    	// #7653, #8125, #8152: local protocol detection
    	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
    	rnoContent = /^(?:GET|HEAD)$/,
    	rprotocol = /^\/\//,

    	/* Prefilters
    	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
    	 * 2) These are called:
    	 *    - BEFORE asking for a transport
    	 *    - AFTER param serialization (s.data is a string if s.processData is true)
    	 * 3) key is the dataType
    	 * 4) the catchall symbol "*" can be used
    	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
    	 */
    	prefilters = {},

    	/* Transports bindings
    	 * 1) key is the dataType
    	 * 2) the catchall symbol "*" can be used
    	 * 3) selection will start with transport dataType and THEN go to "*" if needed
    	 */
    	transports = {},

    	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
    	allTypes = "*/".concat( "*" ),

    	// Anchor tag for parsing the document origin
    	originAnchor = document.createElement( "a" );

    originAnchor.href = location.href;

    // Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
    function addToPrefiltersOrTransports( structure ) {

    	// dataTypeExpression is optional and defaults to "*"
    	return function( dataTypeExpression, func ) {

    		if ( typeof dataTypeExpression !== "string" ) {
    			func = dataTypeExpression;
    			dataTypeExpression = "*";
    		}

    		var dataType,
    			i = 0,
    			dataTypes = dataTypeExpression.toLowerCase().match( rnothtmlwhite ) || [];

    		if ( isFunction( func ) ) {

    			// For each dataType in the dataTypeExpression
    			while ( ( dataType = dataTypes[ i++ ] ) ) {

    				// Prepend if requested
    				if ( dataType[ 0 ] === "+" ) {
    					dataType = dataType.slice( 1 ) || "*";
    					( structure[ dataType ] = structure[ dataType ] || [] ).unshift( func );

    				// Otherwise append
    				} else {
    					( structure[ dataType ] = structure[ dataType ] || [] ).push( func );
    				}
    			}
    		}
    	};
    }

    // Base inspection function for prefilters and transports
    function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

    	var inspected = {},
    		seekingTransport = ( structure === transports );

    	function inspect( dataType ) {
    		var selected;
    		inspected[ dataType ] = true;
    		jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
    			var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
    			if ( typeof dataTypeOrTransport === "string" &&
    				!seekingTransport && !inspected[ dataTypeOrTransport ] ) {

    				options.dataTypes.unshift( dataTypeOrTransport );
    				inspect( dataTypeOrTransport );
    				return false;
    			} else if ( seekingTransport ) {
    				return !( selected = dataTypeOrTransport );
    			}
    		} );
    		return selected;
    	}

    	return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
    }

    // A special extend for ajax options
    // that takes "flat" options (not to be deep extended)
    // Fixes #9887
    function ajaxExtend( target, src ) {
    	var key, deep,
    		flatOptions = jQuery.ajaxSettings.flatOptions || {};

    	for ( key in src ) {
    		if ( src[ key ] !== undefined ) {
    			( flatOptions[ key ] ? target : ( deep || ( deep = {} ) ) )[ key ] = src[ key ];
    		}
    	}
    	if ( deep ) {
    		jQuery.extend( true, target, deep );
    	}

    	return target;
    }

    /* Handles responses to an ajax request:
     * - finds the right dataType (mediates between content-type and expected dataType)
     * - returns the corresponding response
     */
    function ajaxHandleResponses( s, jqXHR, responses ) {

    	var ct, type, finalDataType, firstDataType,
    		contents = s.contents,
    		dataTypes = s.dataTypes;

    	// Remove auto dataType and get content-type in the process
    	while ( dataTypes[ 0 ] === "*" ) {
    		dataTypes.shift();
    		if ( ct === undefined ) {
    			ct = s.mimeType || jqXHR.getResponseHeader( "Content-Type" );
    		}
    	}

    	// Check if we're dealing with a known content-type
    	if ( ct ) {
    		for ( type in contents ) {
    			if ( contents[ type ] && contents[ type ].test( ct ) ) {
    				dataTypes.unshift( type );
    				break;
    			}
    		}
    	}

    	// Check to see if we have a response for the expected dataType
    	if ( dataTypes[ 0 ] in responses ) {
    		finalDataType = dataTypes[ 0 ];
    	} else {

    		// Try convertible dataTypes
    		for ( type in responses ) {
    			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[ 0 ] ] ) {
    				finalDataType = type;
    				break;
    			}
    			if ( !firstDataType ) {
    				firstDataType = type;
    			}
    		}

    		// Or just use first one
    		finalDataType = finalDataType || firstDataType;
    	}

    	// If we found a dataType
    	// We add the dataType to the list if needed
    	// and return the corresponding response
    	if ( finalDataType ) {
    		if ( finalDataType !== dataTypes[ 0 ] ) {
    			dataTypes.unshift( finalDataType );
    		}
    		return responses[ finalDataType ];
    	}
    }

    /* Chain conversions given the request and the original response
     * Also sets the responseXXX fields on the jqXHR instance
     */
    function ajaxConvert( s, response, jqXHR, isSuccess ) {
    	var conv2, current, conv, tmp, prev,
    		converters = {},

    		// Work with a copy of dataTypes in case we need to modify it for conversion
    		dataTypes = s.dataTypes.slice();

    	// Create converters map with lowercased keys
    	if ( dataTypes[ 1 ] ) {
    		for ( conv in s.converters ) {
    			converters[ conv.toLowerCase() ] = s.converters[ conv ];
    		}
    	}

    	current = dataTypes.shift();

    	// Convert to each sequential dataType
    	while ( current ) {

    		if ( s.responseFields[ current ] ) {
    			jqXHR[ s.responseFields[ current ] ] = response;
    		}

    		// Apply the dataFilter if provided
    		if ( !prev && isSuccess && s.dataFilter ) {
    			response = s.dataFilter( response, s.dataType );
    		}

    		prev = current;
    		current = dataTypes.shift();

    		if ( current ) {

    			// There's only work to do if current dataType is non-auto
    			if ( current === "*" ) {

    				current = prev;

    			// Convert response if prev dataType is non-auto and differs from current
    			} else if ( prev !== "*" && prev !== current ) {

    				// Seek a direct converter
    				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

    				// If none found, seek a pair
    				if ( !conv ) {
    					for ( conv2 in converters ) {

    						// If conv2 outputs current
    						tmp = conv2.split( " " );
    						if ( tmp[ 1 ] === current ) {

    							// If prev can be converted to accepted input
    							conv = converters[ prev + " " + tmp[ 0 ] ] ||
    								converters[ "* " + tmp[ 0 ] ];
    							if ( conv ) {

    								// Condense equivalence converters
    								if ( conv === true ) {
    									conv = converters[ conv2 ];

    								// Otherwise, insert the intermediate dataType
    								} else if ( converters[ conv2 ] !== true ) {
    									current = tmp[ 0 ];
    									dataTypes.unshift( tmp[ 1 ] );
    								}
    								break;
    							}
    						}
    					}
    				}

    				// Apply converter (if not an equivalence)
    				if ( conv !== true ) {

    					// Unless errors are allowed to bubble, catch and return them
    					if ( conv && s.throws ) {
    						response = conv( response );
    					} else {
    						try {
    							response = conv( response );
    						} catch ( e ) {
    							return {
    								state: "parsererror",
    								error: conv ? e : "No conversion from " + prev + " to " + current
    							};
    						}
    					}
    				}
    			}
    		}
    	}

    	return { state: "success", data: response };
    }

    jQuery.extend( {

    	// Counter for holding the number of active queries
    	active: 0,

    	// Last-Modified header cache for next request
    	lastModified: {},
    	etag: {},

    	ajaxSettings: {
    		url: location.href,
    		type: "GET",
    		isLocal: rlocalProtocol.test( location.protocol ),
    		global: true,
    		processData: true,
    		async: true,
    		contentType: "application/x-www-form-urlencoded; charset=UTF-8",

    		/*
    		timeout: 0,
    		data: null,
    		dataType: null,
    		username: null,
    		password: null,
    		cache: null,
    		throws: false,
    		traditional: false,
    		headers: {},
    		*/

    		accepts: {
    			"*": allTypes,
    			text: "text/plain",
    			html: "text/html",
    			xml: "application/xml, text/xml",
    			json: "application/json, text/javascript"
    		},

    		contents: {
    			xml: /\bxml\b/,
    			html: /\bhtml/,
    			json: /\bjson\b/
    		},

    		responseFields: {
    			xml: "responseXML",
    			text: "responseText",
    			json: "responseJSON"
    		},

    		// Data converters
    		// Keys separate source (or catchall "*") and destination types with a single space
    		converters: {

    			// Convert anything to text
    			"* text": String,

    			// Text to html (true = no transformation)
    			"text html": true,

    			// Evaluate text as a json expression
    			"text json": JSON.parse,

    			// Parse text as xml
    			"text xml": jQuery.parseXML
    		},

    		// For options that shouldn't be deep extended:
    		// you can add your own custom options here if
    		// and when you create one that shouldn't be
    		// deep extended (see ajaxExtend)
    		flatOptions: {
    			url: true,
    			context: true
    		}
    	},

    	// Creates a full fledged settings object into target
    	// with both ajaxSettings and settings fields.
    	// If target is omitted, writes into ajaxSettings.
    	ajaxSetup: function( target, settings ) {
    		return settings ?

    			// Building a settings object
    			ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

    			// Extending ajaxSettings
    			ajaxExtend( jQuery.ajaxSettings, target );
    	},

    	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
    	ajaxTransport: addToPrefiltersOrTransports( transports ),

    	// Main method
    	ajax: function( url, options ) {

    		// If url is an object, simulate pre-1.5 signature
    		if ( typeof url === "object" ) {
    			options = url;
    			url = undefined;
    		}

    		// Force options to be an object
    		options = options || {};

    		var transport,

    			// URL without anti-cache param
    			cacheURL,

    			// Response headers
    			responseHeadersString,
    			responseHeaders,

    			// timeout handle
    			timeoutTimer,

    			// Url cleanup var
    			urlAnchor,

    			// Request state (becomes false upon send and true upon completion)
    			completed,

    			// To know if global events are to be dispatched
    			fireGlobals,

    			// Loop variable
    			i,

    			// uncached part of the url
    			uncached,

    			// Create the final options object
    			s = jQuery.ajaxSetup( {}, options ),

    			// Callbacks context
    			callbackContext = s.context || s,

    			// Context for global events is callbackContext if it is a DOM node or jQuery collection
    			globalEventContext = s.context &&
    				( callbackContext.nodeType || callbackContext.jquery ) ?
    				jQuery( callbackContext ) :
    				jQuery.event,

    			// Deferreds
    			deferred = jQuery.Deferred(),
    			completeDeferred = jQuery.Callbacks( "once memory" ),

    			// Status-dependent callbacks
    			statusCode = s.statusCode || {},

    			// Headers (they are sent all at once)
    			requestHeaders = {},
    			requestHeadersNames = {},

    			// Default abort message
    			strAbort = "canceled",

    			// Fake xhr
    			jqXHR = {
    				readyState: 0,

    				// Builds headers hashtable if needed
    				getResponseHeader: function( key ) {
    					var match;
    					if ( completed ) {
    						if ( !responseHeaders ) {
    							responseHeaders = {};
    							while ( ( match = rheaders.exec( responseHeadersString ) ) ) {
    								responseHeaders[ match[ 1 ].toLowerCase() + " " ] =
    									( responseHeaders[ match[ 1 ].toLowerCase() + " " ] || [] )
    										.concat( match[ 2 ] );
    							}
    						}
    						match = responseHeaders[ key.toLowerCase() + " " ];
    					}
    					return match == null ? null : match.join( ", " );
    				},

    				// Raw string
    				getAllResponseHeaders: function() {
    					return completed ? responseHeadersString : null;
    				},

    				// Caches the header
    				setRequestHeader: function( name, value ) {
    					if ( completed == null ) {
    						name = requestHeadersNames[ name.toLowerCase() ] =
    							requestHeadersNames[ name.toLowerCase() ] || name;
    						requestHeaders[ name ] = value;
    					}
    					return this;
    				},

    				// Overrides response content-type header
    				overrideMimeType: function( type ) {
    					if ( completed == null ) {
    						s.mimeType = type;
    					}
    					return this;
    				},

    				// Status-dependent callbacks
    				statusCode: function( map ) {
    					var code;
    					if ( map ) {
    						if ( completed ) {

    							// Execute the appropriate callbacks
    							jqXHR.always( map[ jqXHR.status ] );
    						} else {

    							// Lazy-add the new callbacks in a way that preserves old ones
    							for ( code in map ) {
    								statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
    							}
    						}
    					}
    					return this;
    				},

    				// Cancel the request
    				abort: function( statusText ) {
    					var finalText = statusText || strAbort;
    					if ( transport ) {
    						transport.abort( finalText );
    					}
    					done( 0, finalText );
    					return this;
    				}
    			};

    		// Attach deferreds
    		deferred.promise( jqXHR );

    		// Add protocol if not provided (prefilters might expect it)
    		// Handle falsy url in the settings object (#10093: consistency with old signature)
    		// We also use the url parameter if available
    		s.url = ( ( url || s.url || location.href ) + "" )
    			.replace( rprotocol, location.protocol + "//" );

    		// Alias method option to type as per ticket #12004
    		s.type = options.method || options.type || s.method || s.type;

    		// Extract dataTypes list
    		s.dataTypes = ( s.dataType || "*" ).toLowerCase().match( rnothtmlwhite ) || [ "" ];

    		// A cross-domain request is in order when the origin doesn't match the current origin.
    		if ( s.crossDomain == null ) {
    			urlAnchor = document.createElement( "a" );

    			// Support: IE <=8 - 11, Edge 12 - 15
    			// IE throws exception on accessing the href property if url is malformed,
    			// e.g. http://example.com:80x/
    			try {
    				urlAnchor.href = s.url;

    				// Support: IE <=8 - 11 only
    				// Anchor's host property isn't correctly set when s.url is relative
    				urlAnchor.href = urlAnchor.href;
    				s.crossDomain = originAnchor.protocol + "//" + originAnchor.host !==
    					urlAnchor.protocol + "//" + urlAnchor.host;
    			} catch ( e ) {

    				// If there is an error parsing the URL, assume it is crossDomain,
    				// it can be rejected by the transport if it is invalid
    				s.crossDomain = true;
    			}
    		}

    		// Convert data if not already a string
    		if ( s.data && s.processData && typeof s.data !== "string" ) {
    			s.data = jQuery.param( s.data, s.traditional );
    		}

    		// Apply prefilters
    		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

    		// If request was aborted inside a prefilter, stop there
    		if ( completed ) {
    			return jqXHR;
    		}

    		// We can fire global events as of now if asked to
    		// Don't fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)
    		fireGlobals = jQuery.event && s.global;

    		// Watch for a new set of requests
    		if ( fireGlobals && jQuery.active++ === 0 ) {
    			jQuery.event.trigger( "ajaxStart" );
    		}

    		// Uppercase the type
    		s.type = s.type.toUpperCase();

    		// Determine if request has content
    		s.hasContent = !rnoContent.test( s.type );

    		// Save the URL in case we're toying with the If-Modified-Since
    		// and/or If-None-Match header later on
    		// Remove hash to simplify url manipulation
    		cacheURL = s.url.replace( rhash, "" );

    		// More options handling for requests with no content
    		if ( !s.hasContent ) {

    			// Remember the hash so we can put it back
    			uncached = s.url.slice( cacheURL.length );

    			// If data is available and should be processed, append data to url
    			if ( s.data && ( s.processData || typeof s.data === "string" ) ) {
    				cacheURL += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data;

    				// #9682: remove data so that it's not used in an eventual retry
    				delete s.data;
    			}

    			// Add or update anti-cache param if needed
    			if ( s.cache === false ) {
    				cacheURL = cacheURL.replace( rantiCache, "$1" );
    				uncached = ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + ( nonce.guid++ ) +
    					uncached;
    			}

    			// Put hash and anti-cache on the URL that will be requested (gh-1732)
    			s.url = cacheURL + uncached;

    		// Change '%20' to '+' if this is encoded form body content (gh-2658)
    		} else if ( s.data && s.processData &&
    			( s.contentType || "" ).indexOf( "application/x-www-form-urlencoded" ) === 0 ) {
    			s.data = s.data.replace( r20, "+" );
    		}

    		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
    		if ( s.ifModified ) {
    			if ( jQuery.lastModified[ cacheURL ] ) {
    				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
    			}
    			if ( jQuery.etag[ cacheURL ] ) {
    				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
    			}
    		}

    		// Set the correct header, if data is being sent
    		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
    			jqXHR.setRequestHeader( "Content-Type", s.contentType );
    		}

    		// Set the Accepts header for the server, depending on the dataType
    		jqXHR.setRequestHeader(
    			"Accept",
    			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[ 0 ] ] ?
    				s.accepts[ s.dataTypes[ 0 ] ] +
    					( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
    				s.accepts[ "*" ]
    		);

    		// Check for headers option
    		for ( i in s.headers ) {
    			jqXHR.setRequestHeader( i, s.headers[ i ] );
    		}

    		// Allow custom headers/mimetypes and early abort
    		if ( s.beforeSend &&
    			( s.beforeSend.call( callbackContext, jqXHR, s ) === false || completed ) ) {

    			// Abort if not done already and return
    			return jqXHR.abort();
    		}

    		// Aborting is no longer a cancellation
    		strAbort = "abort";

    		// Install callbacks on deferreds
    		completeDeferred.add( s.complete );
    		jqXHR.done( s.success );
    		jqXHR.fail( s.error );

    		// Get transport
    		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

    		// If no transport, we auto-abort
    		if ( !transport ) {
    			done( -1, "No Transport" );
    		} else {
    			jqXHR.readyState = 1;

    			// Send global event
    			if ( fireGlobals ) {
    				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
    			}

    			// If request was aborted inside ajaxSend, stop there
    			if ( completed ) {
    				return jqXHR;
    			}

    			// Timeout
    			if ( s.async && s.timeout > 0 ) {
    				timeoutTimer = window.setTimeout( function() {
    					jqXHR.abort( "timeout" );
    				}, s.timeout );
    			}

    			try {
    				completed = false;
    				transport.send( requestHeaders, done );
    			} catch ( e ) {

    				// Rethrow post-completion exceptions
    				if ( completed ) {
    					throw e;
    				}

    				// Propagate others as results
    				done( -1, e );
    			}
    		}

    		// Callback for when everything is done
    		function done( status, nativeStatusText, responses, headers ) {
    			var isSuccess, success, error, response, modified,
    				statusText = nativeStatusText;

    			// Ignore repeat invocations
    			if ( completed ) {
    				return;
    			}

    			completed = true;

    			// Clear timeout if it exists
    			if ( timeoutTimer ) {
    				window.clearTimeout( timeoutTimer );
    			}

    			// Dereference transport for early garbage collection
    			// (no matter how long the jqXHR object will be used)
    			transport = undefined;

    			// Cache response headers
    			responseHeadersString = headers || "";

    			// Set readyState
    			jqXHR.readyState = status > 0 ? 4 : 0;

    			// Determine if successful
    			isSuccess = status >= 200 && status < 300 || status === 304;

    			// Get response data
    			if ( responses ) {
    				response = ajaxHandleResponses( s, jqXHR, responses );
    			}

    			// Use a noop converter for missing script but not if jsonp
    			if ( !isSuccess &&
    				jQuery.inArray( "script", s.dataTypes ) > -1 &&
    				jQuery.inArray( "json", s.dataTypes ) < 0 ) {
    				s.converters[ "text script" ] = function() {};
    			}

    			// Convert no matter what (that way responseXXX fields are always set)
    			response = ajaxConvert( s, response, jqXHR, isSuccess );

    			// If successful, handle type chaining
    			if ( isSuccess ) {

    				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
    				if ( s.ifModified ) {
    					modified = jqXHR.getResponseHeader( "Last-Modified" );
    					if ( modified ) {
    						jQuery.lastModified[ cacheURL ] = modified;
    					}
    					modified = jqXHR.getResponseHeader( "etag" );
    					if ( modified ) {
    						jQuery.etag[ cacheURL ] = modified;
    					}
    				}

    				// if no content
    				if ( status === 204 || s.type === "HEAD" ) {
    					statusText = "nocontent";

    				// if not modified
    				} else if ( status === 304 ) {
    					statusText = "notmodified";

    				// If we have data, let's convert it
    				} else {
    					statusText = response.state;
    					success = response.data;
    					error = response.error;
    					isSuccess = !error;
    				}
    			} else {

    				// Extract error from statusText and normalize for non-aborts
    				error = statusText;
    				if ( status || !statusText ) {
    					statusText = "error";
    					if ( status < 0 ) {
    						status = 0;
    					}
    				}
    			}

    			// Set data for the fake xhr object
    			jqXHR.status = status;
    			jqXHR.statusText = ( nativeStatusText || statusText ) + "";

    			// Success/Error
    			if ( isSuccess ) {
    				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
    			} else {
    				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
    			}

    			// Status-dependent callbacks
    			jqXHR.statusCode( statusCode );
    			statusCode = undefined;

    			if ( fireGlobals ) {
    				globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
    					[ jqXHR, s, isSuccess ? success : error ] );
    			}

    			// Complete
    			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

    			if ( fireGlobals ) {
    				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );

    				// Handle the global AJAX counter
    				if ( !( --jQuery.active ) ) {
    					jQuery.event.trigger( "ajaxStop" );
    				}
    			}
    		}

    		return jqXHR;
    	},

    	getJSON: function( url, data, callback ) {
    		return jQuery.get( url, data, callback, "json" );
    	},

    	getScript: function( url, callback ) {
    		return jQuery.get( url, undefined, callback, "script" );
    	}
    } );

    jQuery.each( [ "get", "post" ], function( _i, method ) {
    	jQuery[ method ] = function( url, data, callback, type ) {

    		// Shift arguments if data argument was omitted
    		if ( isFunction( data ) ) {
    			type = type || callback;
    			callback = data;
    			data = undefined;
    		}

    		// The url can be an options object (which then must have .url)
    		return jQuery.ajax( jQuery.extend( {
    			url: url,
    			type: method,
    			dataType: type,
    			data: data,
    			success: callback
    		}, jQuery.isPlainObject( url ) && url ) );
    	};
    } );

    jQuery.ajaxPrefilter( function( s ) {
    	var i;
    	for ( i in s.headers ) {
    		if ( i.toLowerCase() === "content-type" ) {
    			s.contentType = s.headers[ i ] || "";
    		}
    	}
    } );


    jQuery._evalUrl = function( url, options, doc ) {
    	return jQuery.ajax( {
    		url: url,

    		// Make this explicit, since user can override this through ajaxSetup (#11264)
    		type: "GET",
    		dataType: "script",
    		cache: true,
    		async: false,
    		global: false,

    		// Only evaluate the response if it is successful (gh-4126)
    		// dataFilter is not invoked for failure responses, so using it instead
    		// of the default converter is kludgy but it works.
    		converters: {
    			"text script": function() {}
    		},
    		dataFilter: function( response ) {
    			jQuery.globalEval( response, options, doc );
    		}
    	} );
    };


    jQuery.fn.extend( {
    	wrapAll: function( html ) {
    		var wrap;

    		if ( this[ 0 ] ) {
    			if ( isFunction( html ) ) {
    				html = html.call( this[ 0 ] );
    			}

    			// The elements to wrap the target around
    			wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );

    			if ( this[ 0 ].parentNode ) {
    				wrap.insertBefore( this[ 0 ] );
    			}

    			wrap.map( function() {
    				var elem = this;

    				while ( elem.firstElementChild ) {
    					elem = elem.firstElementChild;
    				}

    				return elem;
    			} ).append( this );
    		}

    		return this;
    	},

    	wrapInner: function( html ) {
    		if ( isFunction( html ) ) {
    			return this.each( function( i ) {
    				jQuery( this ).wrapInner( html.call( this, i ) );
    			} );
    		}

    		return this.each( function() {
    			var self = jQuery( this ),
    				contents = self.contents();

    			if ( contents.length ) {
    				contents.wrapAll( html );

    			} else {
    				self.append( html );
    			}
    		} );
    	},

    	wrap: function( html ) {
    		var htmlIsFunction = isFunction( html );

    		return this.each( function( i ) {
    			jQuery( this ).wrapAll( htmlIsFunction ? html.call( this, i ) : html );
    		} );
    	},

    	unwrap: function( selector ) {
    		this.parent( selector ).not( "body" ).each( function() {
    			jQuery( this ).replaceWith( this.childNodes );
    		} );
    		return this;
    	}
    } );


    jQuery.expr.pseudos.hidden = function( elem ) {
    	return !jQuery.expr.pseudos.visible( elem );
    };
    jQuery.expr.pseudos.visible = function( elem ) {
    	return !!( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length );
    };




    jQuery.ajaxSettings.xhr = function() {
    	try {
    		return new window.XMLHttpRequest();
    	} catch ( e ) {}
    };

    var xhrSuccessStatus = {

    		// File protocol always yields status code 0, assume 200
    		0: 200,

    		// Support: IE <=9 only
    		// #1450: sometimes IE returns 1223 when it should be 204
    		1223: 204
    	},
    	xhrSupported = jQuery.ajaxSettings.xhr();

    support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
    support.ajax = xhrSupported = !!xhrSupported;

    jQuery.ajaxTransport( function( options ) {
    	var callback, errorCallback;

    	// Cross domain only allowed if supported through XMLHttpRequest
    	if ( support.cors || xhrSupported && !options.crossDomain ) {
    		return {
    			send: function( headers, complete ) {
    				var i,
    					xhr = options.xhr();

    				xhr.open(
    					options.type,
    					options.url,
    					options.async,
    					options.username,
    					options.password
    				);

    				// Apply custom fields if provided
    				if ( options.xhrFields ) {
    					for ( i in options.xhrFields ) {
    						xhr[ i ] = options.xhrFields[ i ];
    					}
    				}

    				// Override mime type if needed
    				if ( options.mimeType && xhr.overrideMimeType ) {
    					xhr.overrideMimeType( options.mimeType );
    				}

    				// X-Requested-With header
    				// For cross-domain requests, seeing as conditions for a preflight are
    				// akin to a jigsaw puzzle, we simply never set it to be sure.
    				// (it can always be set on a per-request basis or even using ajaxSetup)
    				// For same-domain requests, won't change header if already provided.
    				if ( !options.crossDomain && !headers[ "X-Requested-With" ] ) {
    					headers[ "X-Requested-With" ] = "XMLHttpRequest";
    				}

    				// Set headers
    				for ( i in headers ) {
    					xhr.setRequestHeader( i, headers[ i ] );
    				}

    				// Callback
    				callback = function( type ) {
    					return function() {
    						if ( callback ) {
    							callback = errorCallback = xhr.onload =
    								xhr.onerror = xhr.onabort = xhr.ontimeout =
    									xhr.onreadystatechange = null;

    							if ( type === "abort" ) {
    								xhr.abort();
    							} else if ( type === "error" ) {

    								// Support: IE <=9 only
    								// On a manual native abort, IE9 throws
    								// errors on any property access that is not readyState
    								if ( typeof xhr.status !== "number" ) {
    									complete( 0, "error" );
    								} else {
    									complete(

    										// File: protocol always yields status 0; see #8605, #14207
    										xhr.status,
    										xhr.statusText
    									);
    								}
    							} else {
    								complete(
    									xhrSuccessStatus[ xhr.status ] || xhr.status,
    									xhr.statusText,

    									// Support: IE <=9 only
    									// IE9 has no XHR2 but throws on binary (trac-11426)
    									// For XHR2 non-text, let the caller handle it (gh-2498)
    									( xhr.responseType || "text" ) !== "text"  ||
    									typeof xhr.responseText !== "string" ?
    										{ binary: xhr.response } :
    										{ text: xhr.responseText },
    									xhr.getAllResponseHeaders()
    								);
    							}
    						}
    					};
    				};

    				// Listen to events
    				xhr.onload = callback();
    				errorCallback = xhr.onerror = xhr.ontimeout = callback( "error" );

    				// Support: IE 9 only
    				// Use onreadystatechange to replace onabort
    				// to handle uncaught aborts
    				if ( xhr.onabort !== undefined ) {
    					xhr.onabort = errorCallback;
    				} else {
    					xhr.onreadystatechange = function() {

    						// Check readyState before timeout as it changes
    						if ( xhr.readyState === 4 ) {

    							// Allow onerror to be called first,
    							// but that will not handle a native abort
    							// Also, save errorCallback to a variable
    							// as xhr.onerror cannot be accessed
    							window.setTimeout( function() {
    								if ( callback ) {
    									errorCallback();
    								}
    							} );
    						}
    					};
    				}

    				// Create the abort callback
    				callback = callback( "abort" );

    				try {

    					// Do send the request (this may raise an exception)
    					xhr.send( options.hasContent && options.data || null );
    				} catch ( e ) {

    					// #14683: Only rethrow if this hasn't been notified as an error yet
    					if ( callback ) {
    						throw e;
    					}
    				}
    			},

    			abort: function() {
    				if ( callback ) {
    					callback();
    				}
    			}
    		};
    	}
    } );




    // Prevent auto-execution of scripts when no explicit dataType was provided (See gh-2432)
    jQuery.ajaxPrefilter( function( s ) {
    	if ( s.crossDomain ) {
    		s.contents.script = false;
    	}
    } );

    // Install script dataType
    jQuery.ajaxSetup( {
    	accepts: {
    		script: "text/javascript, application/javascript, " +
    			"application/ecmascript, application/x-ecmascript"
    	},
    	contents: {
    		script: /\b(?:java|ecma)script\b/
    	},
    	converters: {
    		"text script": function( text ) {
    			jQuery.globalEval( text );
    			return text;
    		}
    	}
    } );

    // Handle cache's special case and crossDomain
    jQuery.ajaxPrefilter( "script", function( s ) {
    	if ( s.cache === undefined ) {
    		s.cache = false;
    	}
    	if ( s.crossDomain ) {
    		s.type = "GET";
    	}
    } );

    // Bind script tag hack transport
    jQuery.ajaxTransport( "script", function( s ) {

    	// This transport only deals with cross domain or forced-by-attrs requests
    	if ( s.crossDomain || s.scriptAttrs ) {
    		var script, callback;
    		return {
    			send: function( _, complete ) {
    				script = jQuery( "<script>" )
    					.attr( s.scriptAttrs || {} )
    					.prop( { charset: s.scriptCharset, src: s.url } )
    					.on( "load error", callback = function( evt ) {
    						script.remove();
    						callback = null;
    						if ( evt ) {
    							complete( evt.type === "error" ? 404 : 200, evt.type );
    						}
    					} );

    				// Use native DOM manipulation to avoid our domManip AJAX trickery
    				document.head.appendChild( script[ 0 ] );
    			},
    			abort: function() {
    				if ( callback ) {
    					callback();
    				}
    			}
    		};
    	}
    } );




    var oldCallbacks = [],
    	rjsonp = /(=)\?(?=&|$)|\?\?/;

    // Default jsonp settings
    jQuery.ajaxSetup( {
    	jsonp: "callback",
    	jsonpCallback: function() {
    		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce.guid++ ) );
    		this[ callback ] = true;
    		return callback;
    	}
    } );

    // Detect, normalize options and install callbacks for jsonp requests
    jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

    	var callbackName, overwritten, responseContainer,
    		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
    			"url" :
    			typeof s.data === "string" &&
    				( s.contentType || "" )
    					.indexOf( "application/x-www-form-urlencoded" ) === 0 &&
    				rjsonp.test( s.data ) && "data"
    		);

    	// Handle iff the expected data type is "jsonp" or we have a parameter to set
    	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

    		// Get callback name, remembering preexisting value associated with it
    		callbackName = s.jsonpCallback = isFunction( s.jsonpCallback ) ?
    			s.jsonpCallback() :
    			s.jsonpCallback;

    		// Insert callback into url or form data
    		if ( jsonProp ) {
    			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
    		} else if ( s.jsonp !== false ) {
    			s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
    		}

    		// Use data converter to retrieve json after script execution
    		s.converters[ "script json" ] = function() {
    			if ( !responseContainer ) {
    				jQuery.error( callbackName + " was not called" );
    			}
    			return responseContainer[ 0 ];
    		};

    		// Force json dataType
    		s.dataTypes[ 0 ] = "json";

    		// Install callback
    		overwritten = window[ callbackName ];
    		window[ callbackName ] = function() {
    			responseContainer = arguments;
    		};

    		// Clean-up function (fires after converters)
    		jqXHR.always( function() {

    			// If previous value didn't exist - remove it
    			if ( overwritten === undefined ) {
    				jQuery( window ).removeProp( callbackName );

    			// Otherwise restore preexisting value
    			} else {
    				window[ callbackName ] = overwritten;
    			}

    			// Save back as free
    			if ( s[ callbackName ] ) {

    				// Make sure that re-using the options doesn't screw things around
    				s.jsonpCallback = originalSettings.jsonpCallback;

    				// Save the callback name for future use
    				oldCallbacks.push( callbackName );
    			}

    			// Call if it was a function and we have a response
    			if ( responseContainer && isFunction( overwritten ) ) {
    				overwritten( responseContainer[ 0 ] );
    			}

    			responseContainer = overwritten = undefined;
    		} );

    		// Delegate to script
    		return "script";
    	}
    } );




    // Support: Safari 8 only
    // In Safari 8 documents created via document.implementation.createHTMLDocument
    // collapse sibling forms: the second one becomes a child of the first one.
    // Because of that, this security measure has to be disabled in Safari 8.
    // https://bugs.webkit.org/show_bug.cgi?id=137337
    support.createHTMLDocument = ( function() {
    	var body = document.implementation.createHTMLDocument( "" ).body;
    	body.innerHTML = "<form></form><form></form>";
    	return body.childNodes.length === 2;
    } )();


    // Argument "data" should be string of html
    // context (optional): If specified, the fragment will be created in this context,
    // defaults to document
    // keepScripts (optional): If true, will include scripts passed in the html string
    jQuery.parseHTML = function( data, context, keepScripts ) {
    	if ( typeof data !== "string" ) {
    		return [];
    	}
    	if ( typeof context === "boolean" ) {
    		keepScripts = context;
    		context = false;
    	}

    	var base, parsed, scripts;

    	if ( !context ) {

    		// Stop scripts or inline event handlers from being executed immediately
    		// by using document.implementation
    		if ( support.createHTMLDocument ) {
    			context = document.implementation.createHTMLDocument( "" );

    			// Set the base href for the created document
    			// so any parsed elements with URLs
    			// are based on the document's URL (gh-2965)
    			base = context.createElement( "base" );
    			base.href = document.location.href;
    			context.head.appendChild( base );
    		} else {
    			context = document;
    		}
    	}

    	parsed = rsingleTag.exec( data );
    	scripts = !keepScripts && [];

    	// Single tag
    	if ( parsed ) {
    		return [ context.createElement( parsed[ 1 ] ) ];
    	}

    	parsed = buildFragment( [ data ], context, scripts );

    	if ( scripts && scripts.length ) {
    		jQuery( scripts ).remove();
    	}

    	return jQuery.merge( [], parsed.childNodes );
    };


    /**
     * Load a url into a page
     */
    jQuery.fn.load = function( url, params, callback ) {
    	var selector, type, response,
    		self = this,
    		off = url.indexOf( " " );

    	if ( off > -1 ) {
    		selector = stripAndCollapse( url.slice( off ) );
    		url = url.slice( 0, off );
    	}

    	// If it's a function
    	if ( isFunction( params ) ) {

    		// We assume that it's the callback
    		callback = params;
    		params = undefined;

    	// Otherwise, build a param string
    	} else if ( params && typeof params === "object" ) {
    		type = "POST";
    	}

    	// If we have elements to modify, make the request
    	if ( self.length > 0 ) {
    		jQuery.ajax( {
    			url: url,

    			// If "type" variable is undefined, then "GET" method will be used.
    			// Make value of this field explicit since
    			// user can override it through ajaxSetup method
    			type: type || "GET",
    			dataType: "html",
    			data: params
    		} ).done( function( responseText ) {

    			// Save response for use in complete callback
    			response = arguments;

    			self.html( selector ?

    				// If a selector was specified, locate the right elements in a dummy div
    				// Exclude scripts to avoid IE 'Permission Denied' errors
    				jQuery( "<div>" ).append( jQuery.parseHTML( responseText ) ).find( selector ) :

    				// Otherwise use the full result
    				responseText );

    		// If the request succeeds, this function gets "data", "status", "jqXHR"
    		// but they are ignored because response was set above.
    		// If it fails, this function gets "jqXHR", "status", "error"
    		} ).always( callback && function( jqXHR, status ) {
    			self.each( function() {
    				callback.apply( this, response || [ jqXHR.responseText, status, jqXHR ] );
    			} );
    		} );
    	}

    	return this;
    };




    jQuery.expr.pseudos.animated = function( elem ) {
    	return jQuery.grep( jQuery.timers, function( fn ) {
    		return elem === fn.elem;
    	} ).length;
    };




    jQuery.offset = {
    	setOffset: function( elem, options, i ) {
    		var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,
    			position = jQuery.css( elem, "position" ),
    			curElem = jQuery( elem ),
    			props = {};

    		// Set position first, in-case top/left are set even on static elem
    		if ( position === "static" ) {
    			elem.style.position = "relative";
    		}

    		curOffset = curElem.offset();
    		curCSSTop = jQuery.css( elem, "top" );
    		curCSSLeft = jQuery.css( elem, "left" );
    		calculatePosition = ( position === "absolute" || position === "fixed" ) &&
    			( curCSSTop + curCSSLeft ).indexOf( "auto" ) > -1;

    		// Need to be able to calculate position if either
    		// top or left is auto and position is either absolute or fixed
    		if ( calculatePosition ) {
    			curPosition = curElem.position();
    			curTop = curPosition.top;
    			curLeft = curPosition.left;

    		} else {
    			curTop = parseFloat( curCSSTop ) || 0;
    			curLeft = parseFloat( curCSSLeft ) || 0;
    		}

    		if ( isFunction( options ) ) {

    			// Use jQuery.extend here to allow modification of coordinates argument (gh-1848)
    			options = options.call( elem, i, jQuery.extend( {}, curOffset ) );
    		}

    		if ( options.top != null ) {
    			props.top = ( options.top - curOffset.top ) + curTop;
    		}
    		if ( options.left != null ) {
    			props.left = ( options.left - curOffset.left ) + curLeft;
    		}

    		if ( "using" in options ) {
    			options.using.call( elem, props );

    		} else {
    			curElem.css( props );
    		}
    	}
    };

    jQuery.fn.extend( {

    	// offset() relates an element's border box to the document origin
    	offset: function( options ) {

    		// Preserve chaining for setter
    		if ( arguments.length ) {
    			return options === undefined ?
    				this :
    				this.each( function( i ) {
    					jQuery.offset.setOffset( this, options, i );
    				} );
    		}

    		var rect, win,
    			elem = this[ 0 ];

    		if ( !elem ) {
    			return;
    		}

    		// Return zeros for disconnected and hidden (display: none) elements (gh-2310)
    		// Support: IE <=11 only
    		// Running getBoundingClientRect on a
    		// disconnected node in IE throws an error
    		if ( !elem.getClientRects().length ) {
    			return { top: 0, left: 0 };
    		}

    		// Get document-relative position by adding viewport scroll to viewport-relative gBCR
    		rect = elem.getBoundingClientRect();
    		win = elem.ownerDocument.defaultView;
    		return {
    			top: rect.top + win.pageYOffset,
    			left: rect.left + win.pageXOffset
    		};
    	},

    	// position() relates an element's margin box to its offset parent's padding box
    	// This corresponds to the behavior of CSS absolute positioning
    	position: function() {
    		if ( !this[ 0 ] ) {
    			return;
    		}

    		var offsetParent, offset, doc,
    			elem = this[ 0 ],
    			parentOffset = { top: 0, left: 0 };

    		// position:fixed elements are offset from the viewport, which itself always has zero offset
    		if ( jQuery.css( elem, "position" ) === "fixed" ) {

    			// Assume position:fixed implies availability of getBoundingClientRect
    			offset = elem.getBoundingClientRect();

    		} else {
    			offset = this.offset();

    			// Account for the *real* offset parent, which can be the document or its root element
    			// when a statically positioned element is identified
    			doc = elem.ownerDocument;
    			offsetParent = elem.offsetParent || doc.documentElement;
    			while ( offsetParent &&
    				( offsetParent === doc.body || offsetParent === doc.documentElement ) &&
    				jQuery.css( offsetParent, "position" ) === "static" ) {

    				offsetParent = offsetParent.parentNode;
    			}
    			if ( offsetParent && offsetParent !== elem && offsetParent.nodeType === 1 ) {

    				// Incorporate borders into its offset, since they are outside its content origin
    				parentOffset = jQuery( offsetParent ).offset();
    				parentOffset.top += jQuery.css( offsetParent, "borderTopWidth", true );
    				parentOffset.left += jQuery.css( offsetParent, "borderLeftWidth", true );
    			}
    		}

    		// Subtract parent offsets and element margins
    		return {
    			top: offset.top - parentOffset.top - jQuery.css( elem, "marginTop", true ),
    			left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true )
    		};
    	},

    	// This method will return documentElement in the following cases:
    	// 1) For the element inside the iframe without offsetParent, this method will return
    	//    documentElement of the parent window
    	// 2) For the hidden or detached element
    	// 3) For body or html element, i.e. in case of the html node - it will return itself
    	//
    	// but those exceptions were never presented as a real life use-cases
    	// and might be considered as more preferable results.
    	//
    	// This logic, however, is not guaranteed and can change at any point in the future
    	offsetParent: function() {
    		return this.map( function() {
    			var offsetParent = this.offsetParent;

    			while ( offsetParent && jQuery.css( offsetParent, "position" ) === "static" ) {
    				offsetParent = offsetParent.offsetParent;
    			}

    			return offsetParent || documentElement;
    		} );
    	}
    } );

    // Create scrollLeft and scrollTop methods
    jQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {
    	var top = "pageYOffset" === prop;

    	jQuery.fn[ method ] = function( val ) {
    		return access( this, function( elem, method, val ) {

    			// Coalesce documents and windows
    			var win;
    			if ( isWindow( elem ) ) {
    				win = elem;
    			} else if ( elem.nodeType === 9 ) {
    				win = elem.defaultView;
    			}

    			if ( val === undefined ) {
    				return win ? win[ prop ] : elem[ method ];
    			}

    			if ( win ) {
    				win.scrollTo(
    					!top ? val : win.pageXOffset,
    					top ? val : win.pageYOffset
    				);

    			} else {
    				elem[ method ] = val;
    			}
    		}, method, val, arguments.length );
    	};
    } );

    // Support: Safari <=7 - 9.1, Chrome <=37 - 49
    // Add the top/left cssHooks using jQuery.fn.position
    // Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
    // Blink bug: https://bugs.chromium.org/p/chromium/issues/detail?id=589347
    // getComputedStyle returns percent when specified for top/left/bottom/right;
    // rather than make the css module depend on the offset module, just check for it here
    jQuery.each( [ "top", "left" ], function( _i, prop ) {
    	jQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,
    		function( elem, computed ) {
    			if ( computed ) {
    				computed = curCSS( elem, prop );

    				// If curCSS returns percentage, fallback to offset
    				return rnumnonpx.test( computed ) ?
    					jQuery( elem ).position()[ prop ] + "px" :
    					computed;
    			}
    		}
    	);
    } );


    // Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
    jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
    	jQuery.each( {
    		padding: "inner" + name,
    		content: type,
    		"": "outer" + name
    	}, function( defaultExtra, funcName ) {

    		// Margin is only for outerHeight, outerWidth
    		jQuery.fn[ funcName ] = function( margin, value ) {
    			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
    				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

    			return access( this, function( elem, type, value ) {
    				var doc;

    				if ( isWindow( elem ) ) {

    					// $( window ).outerWidth/Height return w/h including scrollbars (gh-1729)
    					return funcName.indexOf( "outer" ) === 0 ?
    						elem[ "inner" + name ] :
    						elem.document.documentElement[ "client" + name ];
    				}

    				// Get document width or height
    				if ( elem.nodeType === 9 ) {
    					doc = elem.documentElement;

    					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
    					// whichever is greatest
    					return Math.max(
    						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
    						elem.body[ "offset" + name ], doc[ "offset" + name ],
    						doc[ "client" + name ]
    					);
    				}

    				return value === undefined ?

    					// Get width or height on the element, requesting but not forcing parseFloat
    					jQuery.css( elem, type, extra ) :

    					// Set width or height on the element
    					jQuery.style( elem, type, value, extra );
    			}, type, chainable ? margin : undefined, chainable );
    		};
    	} );
    } );


    jQuery.each( [
    	"ajaxStart",
    	"ajaxStop",
    	"ajaxComplete",
    	"ajaxError",
    	"ajaxSuccess",
    	"ajaxSend"
    ], function( _i, type ) {
    	jQuery.fn[ type ] = function( fn ) {
    		return this.on( type, fn );
    	};
    } );




    jQuery.fn.extend( {

    	bind: function( types, data, fn ) {
    		return this.on( types, null, data, fn );
    	},
    	unbind: function( types, fn ) {
    		return this.off( types, null, fn );
    	},

    	delegate: function( selector, types, data, fn ) {
    		return this.on( types, selector, data, fn );
    	},
    	undelegate: function( selector, types, fn ) {

    		// ( namespace ) or ( selector, types [, fn] )
    		return arguments.length === 1 ?
    			this.off( selector, "**" ) :
    			this.off( types, selector || "**", fn );
    	},

    	hover: function( fnOver, fnOut ) {
    		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
    	}
    } );

    jQuery.each(
    	( "blur focus focusin focusout resize scroll click dblclick " +
    	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
    	"change select submit keydown keypress keyup contextmenu" ).split( " " ),
    	function( _i, name ) {

    		// Handle event binding
    		jQuery.fn[ name ] = function( data, fn ) {
    			return arguments.length > 0 ?
    				this.on( name, null, data, fn ) :
    				this.trigger( name );
    		};
    	}
    );




    // Support: Android <=4.0 only
    // Make sure we trim BOM and NBSP
    var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;

    // Bind a function to a context, optionally partially applying any
    // arguments.
    // jQuery.proxy is deprecated to promote standards (specifically Function#bind)
    // However, it is not slated for removal any time soon
    jQuery.proxy = function( fn, context ) {
    	var tmp, args, proxy;

    	if ( typeof context === "string" ) {
    		tmp = fn[ context ];
    		context = fn;
    		fn = tmp;
    	}

    	// Quick check to determine if target is callable, in the spec
    	// this throws a TypeError, but we will just return undefined.
    	if ( !isFunction( fn ) ) {
    		return undefined;
    	}

    	// Simulated bind
    	args = slice.call( arguments, 2 );
    	proxy = function() {
    		return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
    	};

    	// Set the guid of unique handler to the same of original handler, so it can be removed
    	proxy.guid = fn.guid = fn.guid || jQuery.guid++;

    	return proxy;
    };

    jQuery.holdReady = function( hold ) {
    	if ( hold ) {
    		jQuery.readyWait++;
    	} else {
    		jQuery.ready( true );
    	}
    };
    jQuery.isArray = Array.isArray;
    jQuery.parseJSON = JSON.parse;
    jQuery.nodeName = nodeName;
    jQuery.isFunction = isFunction;
    jQuery.isWindow = isWindow;
    jQuery.camelCase = camelCase;
    jQuery.type = toType;

    jQuery.now = Date.now;

    jQuery.isNumeric = function( obj ) {

    	// As of jQuery 3.0, isNumeric is limited to
    	// strings and numbers (primitives or objects)
    	// that can be coerced to finite numbers (gh-2662)
    	var type = jQuery.type( obj );
    	return ( type === "number" || type === "string" ) &&

    		// parseFloat NaNs numeric-cast false positives ("")
    		// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
    		// subtraction forces infinities to NaN
    		!isNaN( obj - parseFloat( obj ) );
    };

    jQuery.trim = function( text ) {
    	return text == null ?
    		"" :
    		( text + "" ).replace( rtrim, "" );
    };




    var

    	// Map over jQuery in case of overwrite
    	_jQuery = window.jQuery,

    	// Map over the $ in case of overwrite
    	_$ = window.$;

    jQuery.noConflict = function( deep ) {
    	if ( window.$ === jQuery ) {
    		window.$ = _$;
    	}

    	if ( deep && window.jQuery === jQuery ) {
    		window.jQuery = _jQuery;
    	}

    	return jQuery;
    };

    // Expose jQuery and $ identifiers, even in AMD
    // (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
    // and CommonJS for browser emulators (#13566)
    if ( typeof noGlobal === "undefined" ) {
    	window.jQuery = window.$ = jQuery;
    }




    return jQuery;
    } );
    });

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

    const { window: window_1$6 } = globals;
    const file$9 = "src/pages/show-detail.svelte";

    function create_fragment$9(ctx) {
    	let scrolling = false;

    	let clear_scrolling = () => {
    		scrolling = false;
    	};

    	let scrolling_timeout;
    	let t0;
    	let main;
    	let div28;
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
    	let div27;
    	let aside1;
    	let section;
    	let div18;
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
    	let h60;
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
    	let h30;
    	let a5;
    	let t15;
    	let div13;
    	let img2;
    	let img2_src_value;
    	let t16;
    	let div14;
    	let i6;
    	let t17;
    	let i7;
    	let div14_class_value;
    	let t18;
    	let p;
    	let t19;
    	let t20;
    	let div15;
    	let a6;
    	let button0;
    	let t22;
    	let div17;
    	let a7;
    	let img3;
    	let img3_src_value;
    	let t23;
    	let span1;
    	let t25;
    	let t26;
    	let div16;
    	let i8;
    	let t27;
    	let t28;
    	let aside2;
    	let div20;
    	let div19;
    	let img4;
    	let img4_src_value;
    	let t29;
    	let h31;
    	let t31;
    	let h61;
    	let t33;
    	let div26;
    	let div21;
    	let img5;
    	let img5_src_value;
    	let t34;
    	let div25;
    	let div24;
    	let div23;
    	let h62;
    	let t36;
    	let div22;
    	let a8;
    	let button1;
    	let aside2_class_value;
    	let main_transition;
    	let t38;
    	let br0;
    	let br1;
    	let current;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowscroll*/ ctx[4]);

    	const block = {
    		c: function create() {
    			t0 = space();
    			main = element("main");
    			div28 = element("div");
    			aside0 = element("aside");
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			a0 = element("a");
    			img0 = element("img");
    			t1 = space();
    			aside3 = element("aside");
    			div27 = element("div");
    			aside1 = element("aside");
    			section = element("section");
    			div18 = element("div");
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
    			h60 = element("h6");
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
    			h30 = element("h3");
    			a5 = element("a");
    			a5.textContent = "به اینولینکس خوش آمدید";
    			t15 = space();
    			div13 = element("div");
    			img2 = element("img");
    			t16 = space();
    			div14 = element("div");
    			i6 = element("i");
    			t17 = text(" \n                                    ");
    			i7 = element("i");
    			t18 = space();
    			p = element("p");
    			t19 = text("طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.\n                                   \n                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.\n                                   \n                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.\n                                   \n                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.\n                                   \n                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.\n                                   \n                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.\n                                   \n                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.\n                                   \n                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.\n                                   \n                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.\n                                   \n                                    طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید  طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.");
    			t20 = space();
    			div15 = element("div");
    			a6 = element("a");
    			button0 = element("button");
    			button0.textContent = "ادامه مطلب";
    			t22 = space();
    			div17 = element("div");
    			a7 = element("a");
    			img3 = element("img");
    			t23 = space();
    			span1 = element("span");
    			span1.textContent = "مسعودآقایی ساداتی";
    			t25 = text("  ");
    			t26 = space();
    			div16 = element("div");
    			i8 = element("i");
    			t27 = text(" ۵۶");
    			t28 = space();
    			aside2 = element("aside");
    			div20 = element("div");
    			div19 = element("div");
    			img4 = element("img");
    			t29 = space();
    			h31 = element("h3");
    			h31.textContent = "آفرینه";
    			t31 = space();
    			h61 = element("h6");
    			h61.textContent = "زندگی به سبک نوآوری";
    			t33 = space();
    			div26 = element("div");
    			div21 = element("div");
    			img5 = element("img");
    			t34 = space();
    			div25 = element("div");
    			div24 = element("div");
    			div23 = element("div");
    			h62 = element("h6");
    			h62.textContent = "مسعود آقایی ساداتی ";
    			t36 = space();
    			div22 = element("div");
    			a8 = element("a");
    			button1 = element("button");
    			button1.textContent = "ارتباط بگیرید";
    			t38 = space();
    			br0 = element("br");
    			br1 = element("br");
    			document.title = "\n       جزییات مقاله\n    ";
    			attr_dev(img0, "class", "w-100 h-auto dream-job-image ");
    			if (img0.src !== (img0_src_value = "image/job.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$9, 45, 32, 1445);
    			attr_dev(a0, "href", "#");
    			add_location(a0, file$9, 44, 27, 1400);
    			attr_dev(div0, "class", "col-12 px-0");
    			add_location(div0, file$9, 43, 24, 1347);
    			attr_dev(div1, "class", "row w-100 mx-0");
    			add_location(div1, file$9, 42, 20, 1294);
    			attr_dev(div2, "class", "col-12 shadow-radius-section bg-light px-0 py-0");
    			add_location(div2, file$9, 41, 16, 1212);
    			attr_dev(div3, "class", "row mx-0 w-100");
    			add_location(div3, file$9, 40, 12, 1167);
    			attr_dev(aside0, "class", "col-12 col-md-3 mr-1 d-none d-lg-inline px-0");
    			add_location(aside0, file$9, 39, 8, 1093);
    			attr_dev(img1, "class", "cu-image-com mr-1 ");
    			if (img1.src !== (img1_src_value = "../image/afarine.jpg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$9, 63, 52, 2548);
    			attr_dev(div4, "class", "col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width");
    			add_location(div4, file$9, 62, 48, 2426);
    			set_style(i0, "color", "#048af7");
    			attr_dev(i0, "class", "fas fa-check-circle");
    			add_location(i0, file$9, 67, 133, 3054);
    			attr_dev(a1, "href", "magezine");
    			attr_dev(a1, "class", "title-post-link");
    			add_location(a1, file$9, 67, 60, 2981);
    			add_location(h60, file$9, 67, 56, 2977);
    			attr_dev(i1, "class", "fas fa-clock");
    			add_location(i1, file$9, 68, 88, 3210);
    			attr_dev(span0, "class", "show-time-custome");
    			add_location(span0, file$9, 68, 56, 3178);
    			attr_dev(div5, "class", "cu-intro mt-2");
    			add_location(div5, file$9, 66, 52, 2893);
    			attr_dev(div6, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-0 pr-md-4 mr-lg-2 mr-xl-0 pr-xl-3 justify-content-center custome-margin-right ");
    			add_location(div6, file$9, 65, 48, 2718);
    			attr_dev(div7, "class", "row ");
    			add_location(div7, file$9, 61, 44, 2359);
    			attr_dev(div8, "class", "col-11 col-md-11");
    			add_location(div8, file$9, 60, 40, 2283);
    			attr_dev(i2, "class", "fas fa-ellipsis-h -1 ");
    			attr_dev(i2, "type", "button");
    			attr_dev(i2, "data-toggle", "dropdown");
    			add_location(i2, file$9, 75, 44, 3677);
    			attr_dev(i3, "class", "far fa-bookmark");
    			add_location(i3, file$9, 77, 128, 3965);
    			attr_dev(a2, "class", "dropdown-item");
    			attr_dev(a2, "href", "#");
    			add_location(a2, file$9, 77, 93, 3930);
    			add_location(li0, file$9, 77, 48, 3885);
    			attr_dev(i4, "class", "fas fa-share-alt");
    			add_location(i4, file$9, 78, 86, 4108);
    			attr_dev(a3, "class", "dropdown-item");
    			attr_dev(a3, "href", "#");
    			add_location(a3, file$9, 78, 52, 4074);
    			add_location(li1, file$9, 78, 48, 4070);
    			attr_dev(i5, "class", "fas fa-flag");
    			add_location(i5, file$9, 79, 86, 4251);
    			attr_dev(a4, "class", "dropdown-item");
    			attr_dev(a4, "href", "#");
    			add_location(a4, file$9, 79, 52, 4217);
    			add_location(li2, file$9, 79, 48, 4213);
    			attr_dev(ul, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul, file$9, 76, 44, 3796);
    			attr_dev(div9, "class", "report col-1 ml-0 pl-0 pr-3 navbar pr-sm-4 pr-md-3 pr-lg-3 pr-xl-4 ");
    			add_location(div9, file$9, 74, 40, 3551);
    			attr_dev(div10, "class", "row justify-content-between p-2 pl-4 pl-md-2");
    			add_location(div10, file$9, 59, 36, 2184);
    			attr_dev(div11, "class", "col-12");
    			add_location(div11, file$9, 58, 32, 2127);
    			attr_dev(a5, "class", "title-post-link");
    			attr_dev(a5, "href", "#");
    			add_location(a5, file$9, 86, 79, 4647);
    			attr_dev(h30, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h30, file$9, 86, 36, 4604);
    			attr_dev(div12, "class", "col-12 p-0");
    			add_location(div12, file$9, 85, 32, 4543);
    			if (img2.src !== (img2_src_value = "../image/head.jpeg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$9, 89, 36, 4880);
    			attr_dev(div13, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div13, file$9, 88, 32, 4786);
    			attr_dev(i6, "class", "font-icon-plus fas fa-font");
    			add_location(i6, file$9, 92, 36, 5157);
    			attr_dev(i7, "class", "font-icon-minus fas fa-font fa-sm");
    			add_location(i7, file$9, 93, 36, 5304);
    			attr_dev(div14, "class", div14_class_value = "col-12 mt-2 px-4 bg-danger " + (/*y*/ ctx[0] > 500 ? "sticky-top-text-option" : ""));
    			add_location(div14, file$9, 91, 32, 5040);
    			set_style(p, "font-size", /*fontSize*/ ctx[1] + "px");
    			set_style(p, "line-height", /*lineHeight*/ ctx[2] + "px");
    			attr_dev(p, "class", "col-12 mt-1 px-4 post-text");
    			add_location(p, file$9, 95, 32, 5488);
    			attr_dev(button0, "id", "read-more");
    			attr_dev(button0, "class", "btn btn-sm btn-danger col-12 col-md-2 my-1 p-1 offset-0 offset-md-10");
    			add_location(button0, file$9, 189, 40, 15688);
    			attr_dev(a6, "href", "#");
    			add_location(a6, file$9, 188, 36, 15635);
    			attr_dev(div15, "class", "col-12 ");
    			add_location(div15, file$9, 187, 32, 15577);
    			attr_dev(img3, "class", "personal-img");
    			if (img3.src !== (img3_src_value = "../image/1.jpeg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "");
    			add_location(img3, file$9, 195, 40, 16107);
    			attr_dev(span1, "class", "personal-name");
    			add_location(span1, file$9, 196, 40, 16203);
    			attr_dev(a7, "class", "a-clicked");
    			attr_dev(a7, "href", "#");
    			add_location(a7, file$9, 194, 36, 16036);
    			attr_dev(i8, "class", "fas fa-eye");
    			add_location(i8, file$9, 198, 60, 16370);
    			attr_dev(div16, "class", "view-count");
    			add_location(div16, file$9, 198, 36, 16346);
    			attr_dev(div17, "class", "col-12 mb-1 author-show-box pt-1");
    			add_location(div17, file$9, 193, 32, 15953);
    			attr_dev(article, "class", "p-0  shadow-radius-section shadow-section mb-4 bg-light");
    			add_location(article, file$9, 57, 28, 2021);
    			attr_dev(div18, "class", "col-12 p-0 main-article ");
    			add_location(div18, file$9, 56, 24, 1954);
    			attr_dev(section, "class", "row mx-0 mt-1 mr-0 pt-0  ");
    			add_location(section, file$9, 55, 20, 1886);
    			attr_dev(aside1, "class", "col-12 col-md-9 order-first justify-content-between order-md-0 mx-0 ");
    			add_location(aside1, file$9, 54, 16, 1781);
    			attr_dev(img4, "class", "company-img  w-100");
    			if (img4.src !== (img4_src_value = "image/afarine.jpg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "");
    			add_location(img4, file$9, 207, 28, 16874);
    			attr_dev(div19, "class", "col-10 mx-auto mt-3 mb-3 ");
    			add_location(div19, file$9, 206, 24, 16806);
    			attr_dev(h31, "class", "col-12");
    			add_location(h31, file$9, 209, 24, 16993);
    			attr_dev(h61, "class", "col-12 slogan");
    			add_location(h61, file$9, 212, 24, 17102);
    			attr_dev(div20, "class", "row px-0 text-center shadow-radius-section bg-white ");
    			add_location(div20, file$9, 205, 20, 16715);
    			attr_dev(img5, "class", "header-banner-image-person-sidebar border-radius");
    			if (img5.src !== (img5_src_value = "image/1.jpeg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "");
    			add_location(img5, file$9, 218, 28, 17459);
    			attr_dev(div21, "class", "col-12 mt-4 header-image-main border-radius justify-content-center");
    			add_location(div21, file$9, 217, 24, 17350);
    			attr_dev(h62, "class", "font-weight-normal author-sidebar");
    			add_location(h62, file$9, 223, 36, 17796);
    			attr_dev(button1, "class", "btn-sidebar px-0 mx-0 btn-sm col-12 font btn btn-danger text-white rounded-circle rounded-pill");
    			add_location(button1, file$9, 227, 44, 18216);
    			attr_dev(a8, "href", "#");
    			add_location(a8, file$9, 226, 40, 18159);
    			attr_dev(div22, "class", "col-12 mt-4 font mx-0 px-0");
    			add_location(div22, file$9, 224, 36, 17992);
    			attr_dev(div23, "class", "col-10 px-0");
    			add_location(div23, file$9, 222, 32, 17734);
    			attr_dev(div24, "class", "row");
    			add_location(div24, file$9, 221, 28, 17684);
    			attr_dev(div25, "class", "header-detail-show-sidebar col-12 pb-3");
    			add_location(div25, file$9, 220, 24, 17603);
    			attr_dev(div26, "class", " row px-0 text-center shadow-radius-section bg-white mt-3");
    			add_location(div26, file$9, 216, 20, 17254);
    			attr_dev(aside2, "class", aside2_class_value = "" + ((/*y*/ ctx[0] > 40 ? "sticky-top-show-detail-aside " : "") + " mt-1 h-100 col-12 col-md-3 d-none d-md-inline"));
    			add_location(aside2, file$9, 204, 16, 16587);
    			attr_dev(div27, "class", "row px-0 mx-0");
    			add_location(div27, file$9, 53, 12, 1736);
    			attr_dev(aside3, "class", "col-12 col-md-12 col-lg-8 px-0");
    			add_location(aside3, file$9, 52, 8, 1674);
    			attr_dev(div28, "class", "row justify-content-center mx-0");
    			add_location(div28, file$9, 37, 4, 1030);
    			attr_dev(main, "class", "container-fluid pin-parent px-0");
    			add_location(main, file$9, 35, 0, 957);
    			add_location(br0, file$9, 241, 0, 18744);
    			add_location(br1, file$9, 241, 4, 18748);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div28);
    			append_dev(div28, aside0);
    			append_dev(aside0, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, a0);
    			append_dev(a0, img0);
    			append_dev(div28, t1);
    			append_dev(div28, aside3);
    			append_dev(aside3, div27);
    			append_dev(div27, aside1);
    			append_dev(aside1, section);
    			append_dev(section, div18);
    			append_dev(div18, article);
    			append_dev(article, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div4);
    			append_dev(div4, img1);
    			append_dev(div7, t2);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, h60);
    			append_dev(h60, a1);
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
    			append_dev(div12, h30);
    			append_dev(h30, a5);
    			append_dev(article, t15);
    			append_dev(article, div13);
    			append_dev(div13, img2);
    			append_dev(article, t16);
    			append_dev(article, div14);
    			append_dev(div14, i6);
    			append_dev(div14, t17);
    			append_dev(div14, i7);
    			append_dev(article, t18);
    			append_dev(article, p);
    			append_dev(p, t19);
    			append_dev(article, t20);
    			append_dev(article, div15);
    			append_dev(div15, a6);
    			append_dev(a6, button0);
    			append_dev(article, t22);
    			append_dev(article, div17);
    			append_dev(div17, a7);
    			append_dev(a7, img3);
    			append_dev(a7, t23);
    			append_dev(a7, span1);
    			append_dev(a7, t25);
    			append_dev(div17, t26);
    			append_dev(div17, div16);
    			append_dev(div16, i8);
    			append_dev(div16, t27);
    			append_dev(div27, t28);
    			append_dev(div27, aside2);
    			append_dev(aside2, div20);
    			append_dev(div20, div19);
    			append_dev(div19, img4);
    			append_dev(div20, t29);
    			append_dev(div20, h31);
    			append_dev(div20, t31);
    			append_dev(div20, h61);
    			append_dev(aside2, t33);
    			append_dev(aside2, div26);
    			append_dev(div26, div21);
    			append_dev(div21, img5);
    			append_dev(div26, t34);
    			append_dev(div26, div25);
    			append_dev(div25, div24);
    			append_dev(div24, div23);
    			append_dev(div23, h62);
    			append_dev(div23, t36);
    			append_dev(div23, div22);
    			append_dev(div22, a8);
    			append_dev(a8, button1);
    			insert_dev(target, t38, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, br1, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window_1$6, "scroll", () => {
    						scrolling = true;
    						clearTimeout(scrolling_timeout);
    						scrolling_timeout = setTimeout(clear_scrolling, 100);
    						/*onwindowscroll*/ ctx[4]();
    					}),
    					listen_dev(i6, "click", /*click_handler*/ ctx[5], false, false, false),
    					listen_dev(i6, "click", /*click_handler_1*/ ctx[6], false, false, false),
    					listen_dev(i7, "click", /*click_handler_2*/ ctx[7], false, false, false),
    					listen_dev(i7, "click", /*click_handler_3*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*y*/ 1 && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window_1$6.pageXOffset, /*y*/ ctx[0]);
    				scrolling_timeout = setTimeout(clear_scrolling, 100);
    			}

    			if (!current || dirty & /*y*/ 1 && div14_class_value !== (div14_class_value = "col-12 mt-2 px-4 bg-danger " + (/*y*/ ctx[0] > 500 ? "sticky-top-text-option" : ""))) {
    				attr_dev(div14, "class", div14_class_value);
    			}

    			if (!current || dirty & /*fontSize*/ 2) {
    				set_style(p, "font-size", /*fontSize*/ ctx[1] + "px");
    			}

    			if (!current || dirty & /*lineHeight*/ 4) {
    				set_style(p, "line-height", /*lineHeight*/ ctx[2] + "px");
    			}

    			if (!current || dirty & /*y*/ 1 && aside2_class_value !== (aside2_class_value = "" + ((/*y*/ ctx[0] > 40 ? "sticky-top-show-detail-aside " : "") + " mt-1 h-100 col-12 col-md-3 d-none d-md-inline"))) {
    				attr_dev(aside2, "class", aside2_class_value);
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
    			if (detaching) detach_dev(t38);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(br1);
    			mounted = false;
    			run_all(dispose);
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
    	validate_slots("Show_detail", slots, []);
    	let { url = "" } = $$props;
    	let { y } = $$props;
    	let fontSize = 13.5;
    	let lineHeight = 27;
    	const urlParams = new URLSearchParams(window.location.search);
    	const id = urlParams.has("id");

    	//console.log(id);
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
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Show_detail> was created with unknown prop '${key}'`);
    	});

    	function onwindowscroll() {
    		$$invalidate(0, y = window_1$6.pageYOffset);
    	}

    	const click_handler = e => $$invalidate(1, fontSize++, fontSize);
    	const click_handler_1 = e => $$invalidate(2, lineHeight += 1.5);
    	const click_handler_2 = e => $$invalidate(1, fontSize--, fontSize);
    	const click_handler_3 = e => $$invalidate(2, lineHeight -= 1.5);

    	$$self.$$set = $$props => {
    		if ("url" in $$props) $$invalidate(3, url = $$props.url);
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
    		fontSize,
    		lineHeight,
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
    		if ("url" in $$props) $$invalidate(3, url = $$props.url);
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    		if ("fontSize" in $$props) $$invalidate(1, fontSize = $$props.fontSize);
    		if ("lineHeight" in $$props) $$invalidate(2, lineHeight = $$props.lineHeight);
    		if ("isOpen" in $$props) isOpen = $$props.isOpen;
    		if ("currentLocation" in $$props) currentLocation = $$props.currentLocation;
    		if ("splitUrl" in $$props) splitUrl = $$props.splitUrl;
    		if ("lastSugment" in $$props) lastSugment = $$props.lastSugment;
    		if ("map" in $$props) map = $$props.map;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		y,
    		fontSize,
    		lineHeight,
    		url,
    		onwindowscroll,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3
    	];
    }

    class Show_detail extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { url: 3, y: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Show_detail",
    			options,
    			id: create_fragment$9.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*y*/ ctx[0] === undefined && !("y" in props)) {
    			console.warn("<Show_detail> was created without expected prop 'y'");
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

    const { window: window_1$5 } = globals;
    const file$8 = "src/pages/profile.svelte";

    // (37:0) <Router url="{url}">
    function create_default_slot$2(ctx) {
    	let main;
    	let div65;
    	let aside0;
    	let div3;
    	let div2;
    	let div1;
    	let div0;
    	let a0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let aside3;
    	let div14;
    	let div13;
    	let div12;
    	let div4;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let div5;
    	let img2;
    	let img2_src_value;
    	let t2;
    	let div11;
    	let div10;
    	let div9;
    	let h4;
    	let t4;
    	let h60;
    	let i0;
    	let t5;
    	let t6;
    	let h61;
    	let t8;
    	let div8;
    	let div7;
    	let button0;
    	let i1;
    	let t9;
    	let t10;
    	let div6;
    	let button1;
    	let t12;
    	let ul0;
    	let li0;
    	let a1;
    	let i2;
    	let t13;
    	let t14;
    	let li1;
    	let a2;
    	let i3;
    	let t15;
    	let div6_class_value;
    	let t16;
    	let div64;
    	let div63;
    	let div62;
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
    	let t17;
    	let div17;
    	let div16;
    	let h62;
    	let a3;
    	let t19;
    	let span0;
    	let i4;
    	let t20;
    	let t21;
    	let div20;
    	let i5;
    	let t22;
    	let ul1;
    	let li2;
    	let a4;
    	let i6;
    	let t23;
    	let t24;
    	let li3;
    	let a5;
    	let i7;
    	let t25;
    	let t26;
    	let li4;
    	let a6;
    	let i8;
    	let t27;
    	let t28;
    	let div23;
    	let h30;
    	let a7;
    	let t30;
    	let div24;
    	let img4;
    	let img4_src_value;
    	let t31;
    	let p0;
    	let span1;
    	let t33;
    	let span2;
    	let t35;
    	let span3;
    	let div25;
    	let a8;
    	let button2;
    	let t37;
    	let div27;
    	let div26;
    	let i9;
    	let t38;
    	let t39;
    	let article1;
    	let div35;
    	let div34;
    	let div32;
    	let div31;
    	let div28;
    	let img5;
    	let img5_src_value;
    	let t40;
    	let div30;
    	let div29;
    	let h63;
    	let a9;
    	let t42;
    	let span4;
    	let i10;
    	let t43;
    	let t44;
    	let div33;
    	let i11;
    	let t45;
    	let ul2;
    	let li5;
    	let a10;
    	let i12;
    	let t46;
    	let t47;
    	let li6;
    	let a11;
    	let i13;
    	let t48;
    	let t49;
    	let li7;
    	let a12;
    	let i14;
    	let t50;
    	let t51;
    	let div36;
    	let h31;
    	let a13;
    	let t53;
    	let div37;
    	let img6;
    	let img6_src_value;
    	let t54;
    	let p1;
    	let span5;
    	let t56;
    	let span6;
    	let t58;
    	let span7;
    	let div38;
    	let a14;
    	let button3;
    	let t60;
    	let div40;
    	let div39;
    	let i15;
    	let t61;
    	let t62;
    	let article2;
    	let div48;
    	let div47;
    	let div45;
    	let div44;
    	let div41;
    	let img7;
    	let img7_src_value;
    	let t63;
    	let div43;
    	let div42;
    	let h64;
    	let a15;
    	let t65;
    	let span8;
    	let i16;
    	let t66;
    	let t67;
    	let div46;
    	let i17;
    	let t68;
    	let ul3;
    	let li8;
    	let a16;
    	let i18;
    	let t69;
    	let t70;
    	let li9;
    	let a17;
    	let i19;
    	let t71;
    	let t72;
    	let li10;
    	let a18;
    	let i20;
    	let t73;
    	let t74;
    	let div49;
    	let h32;
    	let a19;
    	let t76;
    	let div50;
    	let img8;
    	let img8_src_value;
    	let t77;
    	let p2;
    	let span9;
    	let t79;
    	let span10;
    	let t81;
    	let span11;
    	let div51;
    	let a20;
    	let button4;
    	let t83;
    	let div53;
    	let div52;
    	let i21;
    	let t84;
    	let t85;
    	let aside2;
    	let div61;
    	let div55;
    	let img9;
    	let img9_src_value;
    	let t86;
    	let div56;
    	let img10;
    	let img10_src_value;
    	let t87;
    	let div60;
    	let div59;
    	let div58;
    	let h65;
    	let t89;
    	let h66;
    	let t91;
    	let div57;
    	let a21;
    	let button5;
    	let div61_class_value;
    	let main_transition;
    	let t93;
    	let br0;
    	let br1;
    	let current;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div65 = element("div");
    			aside0 = element("aside");
    			div3 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			a0 = element("a");
    			img0 = element("img");
    			t0 = space();
    			aside3 = element("aside");
    			div14 = element("div");
    			div13 = element("div");
    			div12 = element("div");
    			div4 = element("div");
    			img1 = element("img");
    			t1 = space();
    			div5 = element("div");
    			img2 = element("img");
    			t2 = space();
    			div11 = element("div");
    			div10 = element("div");
    			div9 = element("div");
    			h4 = element("h4");
    			h4.textContent = "مسعود آقایی ساداتی ";
    			t4 = space();
    			h60 = element("h6");
    			i0 = element("i");
    			t5 = text(" تهران,شهرک طالقانی,ساحتمان نگین");
    			t6 = space();
    			h61 = element("h6");
    			h61.textContent = "مدیر شرکت آفرینه و مسپول سایت اینولینکس .به صفحه من خوش آمدید میتوانید مطالب مرتبط به شرکت آفرینه و کارآفرینی و کسب و کار را در اینجا مشاهده کنید";
    			t8 = space();
    			div8 = element("div");
    			div7 = element("div");
    			button0 = element("button");
    			i1 = element("i");
    			t9 = text("بازدید سایت");
    			t10 = space();
    			div6 = element("div");
    			button1 = element("button");
    			button1.textContent = "بیشتر";
    			t12 = space();
    			ul0 = element("ul");
    			li0 = element("li");
    			a1 = element("a");
    			i2 = element("i");
    			t13 = text(" اشتراک صفحه");
    			t14 = space();
    			li1 = element("li");
    			a2 = element("a");
    			i3 = element("i");
    			t15 = text(" گزارش دادن");
    			t16 = space();
    			div64 = element("div");
    			div63 = element("div");
    			div62 = element("div");
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
    			t17 = space();
    			div17 = element("div");
    			div16 = element("div");
    			h62 = element("h6");
    			a3 = element("a");
    			a3.textContent = "مسعود آفایی ساداتی ";
    			t19 = space();
    			span0 = element("span");
    			i4 = element("i");
    			t20 = text(" ۳ دقیقه قبل");
    			t21 = space();
    			div20 = element("div");
    			i5 = element("i");
    			t22 = space();
    			ul1 = element("ul");
    			li2 = element("li");
    			a4 = element("a");
    			i6 = element("i");
    			t23 = text(" ذخیره کردن پست");
    			t24 = space();
    			li3 = element("li");
    			a5 = element("a");
    			i7 = element("i");
    			t25 = text(" کپی کردن لینک");
    			t26 = space();
    			li4 = element("li");
    			a6 = element("a");
    			i8 = element("i");
    			t27 = text(" گزارش دادن");
    			t28 = space();
    			div23 = element("div");
    			h30 = element("h3");
    			a7 = element("a");
    			a7.textContent = "به اینولینکس خوش آمدید";
    			t30 = space();
    			div24 = element("div");
    			img4 = element("img");
    			t31 = space();
    			p0 = element("p");
    			span1 = element("span");
    			span1.textContent = "طراحان سایت هنگام طراحی قالب سایت معمولا با این موضوع رو برو هستند که محتوای اصلی صفحات آماده نیست. در نتیجه طرح کلی دید درستی به کار فرما نمیدهد. اگر طراح بخواهد دنبال متن های مرتبط بگردد تمرکزش از روی کار اصلی برداشته میشود و اینکار زمان بر خواهد بود. همچنین طراح به دنبال این است که پس از ارایه کار نظر دیگران را در مورد طراحی جویا شود و نمی‌خواهد افراد روی متن های موجود تمرکز کنند.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n            نکته بعدی در مورد متن ساختگی لورم ایپسوم این است که بعضی از طراحان وبسایت و گرافیست کاران بعد از آنکه قالب و محتوای مورد نظرشون را ایجاد کردند از یاد می‌برند که متن لورم را از قسمتهای مختلف .";
    			t33 = space();
    			span2 = element("span");
    			span2.textContent = "بیشتر بخوانید";
    			t35 = space();
    			span3 = element("span");
    			div25 = element("div");
    			a8 = element("a");
    			button2 = element("button");
    			button2.textContent = "ادامه مطلب";
    			t37 = space();
    			div27 = element("div");
    			div26 = element("div");
    			i9 = element("i");
    			t38 = text(" ۵۶");
    			t39 = space();
    			article1 = element("article");
    			div35 = element("div");
    			div34 = element("div");
    			div32 = element("div");
    			div31 = element("div");
    			div28 = element("div");
    			img5 = element("img");
    			t40 = space();
    			div30 = element("div");
    			div29 = element("div");
    			h63 = element("h6");
    			a9 = element("a");
    			a9.textContent = "مسعود آفایی ساداتی ";
    			t42 = space();
    			span4 = element("span");
    			i10 = element("i");
    			t43 = text(" ۳ دقیقه قبل");
    			t44 = space();
    			div33 = element("div");
    			i11 = element("i");
    			t45 = space();
    			ul2 = element("ul");
    			li5 = element("li");
    			a10 = element("a");
    			i12 = element("i");
    			t46 = text(" ذخیره کردن پست");
    			t47 = space();
    			li6 = element("li");
    			a11 = element("a");
    			i13 = element("i");
    			t48 = text(" کپی کردن لینک");
    			t49 = space();
    			li7 = element("li");
    			a12 = element("a");
    			i14 = element("i");
    			t50 = text(" گزارش دادن");
    			t51 = space();
    			div36 = element("div");
    			h31 = element("h3");
    			a13 = element("a");
    			a13.textContent = "به اینولینکس خوش آمدید";
    			t53 = space();
    			div37 = element("div");
    			img6 = element("img");
    			t54 = space();
    			p1 = element("p");
    			span5 = element("span");
    			span5.textContent = "طراحان سایت هنگام طراحی قالب سایت معمولا با این موضوع رو برو هستند که محتوای اصلی صفحات آماده نیست. در نتیجه طرح کلی دید درستی به کار فرما نمیدهد. اگر طراح بخواهد دنبال متن های مرتبط بگردد تمرکزش از روی کار اصلی برداشته میشود و اینکار زمان بر خواهد بود. همچنین طراح به دنبال این است که پس از ارایه کار نظر دیگران را در مورد طراحی جویا شود و نمی‌خواهد افراد روی متن های موجود تمرکز کنند.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n            نکته بعدی در مورد متن ساختگی لورم ایپسوم این است که بعضی از طراحان وبسایت و گرافیست کاران بعد از آنکه قالب و محتوای مورد نظرشون را ایجاد کردند از یاد می‌برند که متن لورم را از قسمتهای مختلف .";
    			t56 = space();
    			span6 = element("span");
    			span6.textContent = "بیشتر بخوانید";
    			t58 = space();
    			span7 = element("span");
    			div38 = element("div");
    			a14 = element("a");
    			button3 = element("button");
    			button3.textContent = "ادامه مطلب";
    			t60 = space();
    			div40 = element("div");
    			div39 = element("div");
    			i15 = element("i");
    			t61 = text(" ۵۶");
    			t62 = space();
    			article2 = element("article");
    			div48 = element("div");
    			div47 = element("div");
    			div45 = element("div");
    			div44 = element("div");
    			div41 = element("div");
    			img7 = element("img");
    			t63 = space();
    			div43 = element("div");
    			div42 = element("div");
    			h64 = element("h6");
    			a15 = element("a");
    			a15.textContent = "مسعود آفایی ساداتی ";
    			t65 = space();
    			span8 = element("span");
    			i16 = element("i");
    			t66 = text(" ۳ دقیقه قبل");
    			t67 = space();
    			div46 = element("div");
    			i17 = element("i");
    			t68 = space();
    			ul3 = element("ul");
    			li8 = element("li");
    			a16 = element("a");
    			i18 = element("i");
    			t69 = text(" ذخیره کردن پست");
    			t70 = space();
    			li9 = element("li");
    			a17 = element("a");
    			i19 = element("i");
    			t71 = text(" کپی کردن لینک");
    			t72 = space();
    			li10 = element("li");
    			a18 = element("a");
    			i20 = element("i");
    			t73 = text(" گزارش دادن");
    			t74 = space();
    			div49 = element("div");
    			h32 = element("h3");
    			a19 = element("a");
    			a19.textContent = "به اینولینکس خوش آمدید";
    			t76 = space();
    			div50 = element("div");
    			img8 = element("img");
    			t77 = space();
    			p2 = element("p");
    			span9 = element("span");
    			span9.textContent = "طراحان سایت هنگام طراحی قالب سایت معمولا با این موضوع رو برو هستند که محتوای اصلی صفحات آماده نیست. در نتیجه طرح کلی دید درستی به کار فرما نمیدهد. اگر طراح بخواهد دنبال متن های مرتبط بگردد تمرکزش از روی کار اصلی برداشته میشود و اینکار زمان بر خواهد بود. همچنین طراح به دنبال این است که پس از ارایه کار نظر دیگران را در مورد طراحی جویا شود و نمی‌خواهد افراد روی متن های موجود تمرکز کنند.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n            نکته بعدی در مورد متن ساختگی لورم ایپسوم این است که بعضی از طراحان وبسایت و گرافیست کاران بعد از آنکه قالب و محتوای مورد نظرشون را ایجاد کردند از یاد می‌برند که متن لورم را از قسمتهای مختلف .";
    			t79 = space();
    			span10 = element("span");
    			span10.textContent = "بیشتر بخوانید";
    			t81 = space();
    			span11 = element("span");
    			div51 = element("div");
    			a20 = element("a");
    			button4 = element("button");
    			button4.textContent = "ادامه مطلب";
    			t83 = space();
    			div53 = element("div");
    			div52 = element("div");
    			i21 = element("i");
    			t84 = text(" ۵۶");
    			t85 = space();
    			aside2 = element("aside");
    			div61 = element("div");
    			div55 = element("div");
    			img9 = element("img");
    			t86 = space();
    			div56 = element("div");
    			img10 = element("img");
    			t87 = space();
    			div60 = element("div");
    			div59 = element("div");
    			div58 = element("div");
    			h65 = element("h6");
    			h65.textContent = "مسعود آقایی ساداتی ";
    			t89 = space();
    			h66 = element("h6");
    			h66.textContent = "مدیر شرکت آفرینه و مسیول سایت اینولینکس .به صفحه من خوش آمدید میتوانید مطالب مرتبط به شرکت آفرینه و کارآفرینی و کسب و کار را در اینجا مشاهده کنید";
    			t91 = space();
    			div57 = element("div");
    			a21 = element("a");
    			button5 = element("button");
    			button5.textContent = "ارتباط بگیرید";
    			t93 = space();
    			br0 = element("br");
    			br1 = element("br");
    			attr_dev(img0, "class", "h-auto w-100 dream-job-image ");
    			if (img0.src !== (img0_src_value = "image/job.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$8, 87, 32, 3657);
    			attr_dev(a0, "href", "#");
    			add_location(a0, file$8, 86, 27, 3612);
    			attr_dev(div0, "class", "col-12 px-0");
    			add_location(div0, file$8, 85, 24, 3559);
    			attr_dev(div1, "class", "row w-100 mx-0");
    			add_location(div1, file$8, 84, 20, 3506);
    			attr_dev(div2, "class", "col-12 shadow-radius-section bg-light px-0 py-0");
    			add_location(div2, file$8, 83, 16, 3424);
    			attr_dev(div3, "class", "row mx-0 w-100");
    			add_location(div3, file$8, 82, 12, 3379);
    			attr_dev(aside0, "class", "col-12 col-md-3 mr-1 d-none d-lg-inline px-0");
    			add_location(aside0, file$8, 81, 8, 3305);
    			attr_dev(img1, "class", " header-image-person bg-light");
    			if (img1.src !== (img1_src_value = "image/head.jpeg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$8, 99, 28, 4156);
    			attr_dev(div4, "class", "col-12 p-0 banner");
    			add_location(div4, file$8, 98, 24, 4095);
    			attr_dev(img2, "class", "header-logo-image-person border-radius");
    			if (img2.src !== (img2_src_value = "image/1.jpeg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$8, 102, 28, 4365);
    			attr_dev(div5, "class", "col-12 header-image-main border-radius");
    			add_location(div5, file$8, 101, 24, 4284);
    			attr_dev(h4, "class", "font-weight-normal text-font-size");
    			add_location(h4, file$8, 107, 36, 4675);
    			attr_dev(i0, "class", "fas fa-map-marker-alt");
    			add_location(i0, file$8, 108, 63, 4898);
    			attr_dev(h60, "class", "text-secondary");
    			add_location(h60, file$8, 108, 36, 4871);
    			attr_dev(h61, "class", "explain-about-page");
    			add_location(h61, file$8, 109, 36, 5014);
    			attr_dev(i1, "class", "fas fa-external-link-alt padding-button ml-2 icon-size");
    			add_location(i1, file$8, 112, 148, 5480);
    			attr_dev(button0, "class", "btn rounded-pill mb-1 col-custom font btn-mw-profile text-center visit-btn mx-0 mx-sm-1");
    			add_location(button0, file$8, 112, 44, 5376);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "data-toggle", "dropdown");
    			attr_dev(button1, "class", "pt-custome-more-btn btn btn-mw-profile rounded-pill col-12 font text-center col-md-6 mr-2");
    			add_location(button1, file$8, 114, 48, 5769);
    			attr_dev(i2, "class", "fas fa-share-alt");
    			add_location(i2, file$8, 116, 68, 6085);
    			attr_dev(a1, "href", "#");
    			add_location(a1, file$8, 116, 56, 6073);
    			add_location(li0, file$8, 116, 52, 6069);
    			attr_dev(i3, "class", "fas fa-flag");
    			add_location(i3, file$8, 117, 68, 6208);
    			attr_dev(a2, "href", "#");
    			add_location(a2, file$8, 117, 56, 6196);
    			add_location(li1, file$8, 117, 52, 6192);
    			attr_dev(ul0, "class", "dropdown-menu  ellipsis-menu");
    			add_location(ul0, file$8, 115, 48, 5975);
    			attr_dev(div6, "class", div6_class_value = "" + ((/*x*/ ctx[1] <= 320 ? "col-12" : "col-5") + " col-md-3 justify-content-start navbar dropdown dropleft pr-1"));
    			add_location(div6, file$8, 113, 44, 5616);
    			attr_dev(div7, "class", "row vm-navbar");
    			add_location(div7, file$8, 111, 40, 5304);
    			attr_dev(div8, "class", "col-12 mt-4 font");
    			add_location(div8, file$8, 110, 36, 5233);
    			attr_dev(div9, "class", "col-10 ");
    			add_location(div9, file$8, 106, 32, 4617);
    			attr_dev(div10, "class", "row");
    			add_location(div10, file$8, 105, 28, 4567);
    			attr_dev(div11, "class", "header-detail col-12 pb-3");
    			add_location(div11, file$8, 104, 24, 4499);
    			attr_dev(div12, "class", "row p-0 shadow-radius-section bg-white");
    			add_location(div12, file$8, 97, 20, 4017);
    			attr_dev(div13, "class", "col-12 ");
    			add_location(div13, file$8, 96, 16, 3975);
    			attr_dev(div14, "class", "row ml-lg-0 ");
    			add_location(div14, file$8, 95, 12, 3932);
    			attr_dev(img3, "class", "cu-image mr-1 ");
    			if (img3.src !== (img3_src_value = "image/1.jpeg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "");
    			add_location(img3, file$8, 151, 60, 8520);
    			attr_dev(div15, "class", "col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width");
    			add_location(div15, file$8, 150, 56, 8390);
    			attr_dev(a3, "href", "magezine");
    			attr_dev(a3, "class", "title-post-link");
    			add_location(a3, file$8, 155, 68, 8973);
    			add_location(h62, file$8, 155, 64, 8969);
    			attr_dev(i4, "class", "fas fa-clock");
    			add_location(i4, file$8, 156, 96, 9214);
    			attr_dev(span0, "class", "show-time-custome");
    			add_location(span0, file$8, 156, 64, 9182);
    			attr_dev(div16, "class", "cu-intro mt-2");
    			add_location(div16, file$8, 154, 60, 8877);
    			attr_dev(div17, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-0 pr-md-4 mr-lg-2 mr-xl-0 pr-xl-3 justify-content-center custome-margin-right ");
    			add_location(div17, file$8, 153, 56, 8694);
    			attr_dev(div18, "class", "row ");
    			add_location(div18, file$8, 149, 52, 8315);
    			attr_dev(div19, "class", "col-11 col-md-11");
    			add_location(div19, file$8, 148, 48, 8231);
    			attr_dev(i5, "class", "fas fa-ellipsis-h -1 ");
    			attr_dev(i5, "type", "button");
    			attr_dev(i5, "data-toggle", "dropdown");
    			add_location(i5, file$8, 162, 52, 9681);
    			attr_dev(i6, "class", "far fa-bookmark");
    			add_location(i6, file$8, 164, 136, 9985);
    			attr_dev(a4, "class", "dropdown-item");
    			attr_dev(a4, "href", "#");
    			add_location(a4, file$8, 164, 101, 9950);
    			add_location(li2, file$8, 164, 56, 9905);
    			attr_dev(i7, "class", "fas fa-share-alt");
    			add_location(i7, file$8, 165, 94, 10136);
    			attr_dev(a5, "class", "dropdown-item");
    			attr_dev(a5, "href", "#");
    			add_location(a5, file$8, 165, 60, 10102);
    			add_location(li3, file$8, 165, 56, 10098);
    			attr_dev(i8, "class", "fas fa-flag");
    			add_location(i8, file$8, 166, 94, 10287);
    			attr_dev(a6, "class", "dropdown-item");
    			attr_dev(a6, "href", "#");
    			add_location(a6, file$8, 166, 60, 10253);
    			add_location(li4, file$8, 166, 56, 10249);
    			attr_dev(ul1, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul1, file$8, 163, 52, 9808);
    			attr_dev(div20, "class", "report dropdown col-1 ml-0 pl-0 pr-3 navbar pr-md-3 pr-lg-4 ");
    			add_location(div20, file$8, 161, 48, 9554);
    			attr_dev(div21, "class", "row justify-content-between p-2 pl-4 pl-md-2");
    			add_location(div21, file$8, 147, 44, 8124);
    			attr_dev(div22, "class", "col-12");
    			add_location(div22, file$8, 146, 40, 8059);
    			attr_dev(a7, "class", "title-post-link");
    			attr_dev(a7, "href", "magezine/show-detail");
    			add_location(a7, file$8, 173, 88, 10740);
    			attr_dev(h30, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h30, file$8, 173, 44, 10696);
    			attr_dev(div23, "class", "col-12 p-0");
    			add_location(div23, file$8, 172, 40, 10627);
    			if (img4.src !== (img4_src_value = "image/30.jpg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img4, "alt", "");
    			add_location(img4, file$8, 176, 44, 11016);
    			attr_dev(div24, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div24, file$8, 175, 40, 10914);
    			attr_dev(span1, "class", "content d-inline");
    			add_location(span1, file$8, 180, 44, 11315);
    			attr_dev(span2, "class", "read-more-custom");
    			attr_dev(span2, "onclick", "readMore(this)");
    			set_style(span2, "cursor", "pointer");
    			add_location(span2, file$8, 192, 44, 14839);
    			attr_dev(button2, "class", "btn btn-sm btn-danger col-12 my-1 p-1 offset-0 font-family");
    			add_location(button2, file$8, 196, 56, 15281);
    			attr_dev(a8, "href", "magezine/show-detail");
    			attr_dev(a8, "class", "col-3 col-md-2 px-0");
    			add_location(a8, file$8, 195, 52, 15165);
    			attr_dev(div25, "class", "row pl-0 ml-0 pt-2 justify-content-end ");
    			add_location(div25, file$8, 194, 48, 15059);
    			attr_dev(span3, "class", "read-more ");
    			add_location(span3, file$8, 193, 44, 14985);
    			attr_dev(p0, "class", "post-text col-12 mt-3 post-text");
    			add_location(p0, file$8, 179, 40, 11227);
    			attr_dev(i9, "class", "fas fa-eye");
    			add_location(i9, file$8, 204, 68, 15830);
    			attr_dev(div26, "class", "view-count");
    			add_location(div26, file$8, 204, 44, 15806);
    			attr_dev(div27, "class", "col-12 mb-1 author-show-box pt-1");
    			add_location(div27, file$8, 202, 40, 15670);
    			attr_dev(article0, "class", "p-0  shadow-radius-section shadow-section mb-4 bg-light");
    			add_location(article0, file$8, 145, 36, 7945);
    			attr_dev(img5, "class", "cu-image mr-1 ");
    			if (img5.src !== (img5_src_value = "image/1.jpeg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "");
    			add_location(img5, file$8, 213, 60, 16571);
    			attr_dev(div28, "class", "col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width");
    			add_location(div28, file$8, 212, 56, 16441);
    			attr_dev(a9, "href", "magezine");
    			attr_dev(a9, "class", "title-post-link");
    			add_location(a9, file$8, 217, 68, 17024);
    			add_location(h63, file$8, 217, 64, 17020);
    			attr_dev(i10, "class", "fas fa-clock");
    			add_location(i10, file$8, 218, 96, 17265);
    			attr_dev(span4, "class", "show-time-custome");
    			add_location(span4, file$8, 218, 64, 17233);
    			attr_dev(div29, "class", "cu-intro mt-2");
    			add_location(div29, file$8, 216, 60, 16928);
    			attr_dev(div30, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-0 pr-md-4 mr-lg-2 mr-xl-0 pr-xl-3 justify-content-center custome-margin-right ");
    			add_location(div30, file$8, 215, 56, 16745);
    			attr_dev(div31, "class", "row ");
    			add_location(div31, file$8, 211, 52, 16366);
    			attr_dev(div32, "class", "col-11 col-md-11");
    			add_location(div32, file$8, 210, 48, 16282);
    			attr_dev(i11, "class", "fas fa-ellipsis-h -1 ");
    			attr_dev(i11, "type", "button");
    			attr_dev(i11, "data-toggle", "dropdown");
    			add_location(i11, file$8, 224, 52, 17732);
    			attr_dev(i12, "class", "far fa-bookmark");
    			add_location(i12, file$8, 226, 136, 18036);
    			attr_dev(a10, "class", "dropdown-item");
    			attr_dev(a10, "href", "#");
    			add_location(a10, file$8, 226, 101, 18001);
    			add_location(li5, file$8, 226, 56, 17956);
    			attr_dev(i13, "class", "fas fa-share-alt");
    			add_location(i13, file$8, 227, 94, 18187);
    			attr_dev(a11, "class", "dropdown-item");
    			attr_dev(a11, "href", "#");
    			add_location(a11, file$8, 227, 60, 18153);
    			add_location(li6, file$8, 227, 56, 18149);
    			attr_dev(i14, "class", "fas fa-flag");
    			add_location(i14, file$8, 228, 94, 18338);
    			attr_dev(a12, "class", "dropdown-item");
    			attr_dev(a12, "href", "#");
    			add_location(a12, file$8, 228, 60, 18304);
    			add_location(li7, file$8, 228, 56, 18300);
    			attr_dev(ul2, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul2, file$8, 225, 52, 17859);
    			attr_dev(div33, "class", "report dropdown col-1 ml-0 pl-0 pr-3 navbar pr-md-3 pr-lg-4 ");
    			add_location(div33, file$8, 223, 48, 17605);
    			attr_dev(div34, "class", "row justify-content-between p-2 pl-4 pl-md-2");
    			add_location(div34, file$8, 209, 44, 16175);
    			attr_dev(div35, "class", "col-12");
    			add_location(div35, file$8, 208, 40, 16110);
    			attr_dev(a13, "class", "title-post-link");
    			attr_dev(a13, "href", "magezine/show-detail");
    			add_location(a13, file$8, 235, 88, 18791);
    			attr_dev(h31, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h31, file$8, 235, 44, 18747);
    			attr_dev(div36, "class", "col-12 p-0");
    			add_location(div36, file$8, 234, 40, 18678);
    			if (img6.src !== (img6_src_value = "image/30.jpg")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img6, "alt", "");
    			add_location(img6, file$8, 238, 44, 19067);
    			attr_dev(div37, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div37, file$8, 237, 40, 18965);
    			attr_dev(span5, "class", "content d-inline");
    			add_location(span5, file$8, 242, 44, 19366);
    			attr_dev(span6, "class", "read-more-custom");
    			attr_dev(span6, "onclick", "readMore(this)");
    			set_style(span6, "cursor", "pointer");
    			add_location(span6, file$8, 254, 44, 22890);
    			attr_dev(button3, "class", "btn btn-sm btn-danger col-12 my-1 p-1 offset-0 font-family");
    			add_location(button3, file$8, 258, 56, 23332);
    			attr_dev(a14, "href", "magezine/show-detail");
    			attr_dev(a14, "class", "col-3 col-md-2 px-0");
    			add_location(a14, file$8, 257, 52, 23216);
    			attr_dev(div38, "class", "row pl-0 ml-0 pt-2 justify-content-end ");
    			add_location(div38, file$8, 256, 48, 23110);
    			attr_dev(span7, "class", "read-more ");
    			add_location(span7, file$8, 255, 44, 23036);
    			attr_dev(p1, "class", "post-text col-12 mt-3 post-text");
    			add_location(p1, file$8, 241, 40, 19278);
    			attr_dev(i15, "class", "fas fa-eye");
    			add_location(i15, file$8, 266, 68, 23881);
    			attr_dev(div39, "class", "view-count");
    			add_location(div39, file$8, 266, 44, 23857);
    			attr_dev(div40, "class", "col-12 mb-1 author-show-box pt-1");
    			add_location(div40, file$8, 264, 40, 23721);
    			attr_dev(article1, "class", "p-0  shadow-radius-section shadow-section mb-4 bg-light");
    			add_location(article1, file$8, 207, 36, 15996);
    			attr_dev(img7, "class", "cu-image mr-1 ");
    			if (img7.src !== (img7_src_value = "image/1.jpeg")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "alt", "");
    			add_location(img7, file$8, 275, 60, 24622);
    			attr_dev(div41, "class", "col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width");
    			add_location(div41, file$8, 274, 56, 24492);
    			attr_dev(a15, "href", "magezine");
    			attr_dev(a15, "class", "title-post-link");
    			add_location(a15, file$8, 279, 68, 25075);
    			add_location(h64, file$8, 279, 64, 25071);
    			attr_dev(i16, "class", "fas fa-clock");
    			add_location(i16, file$8, 280, 96, 25316);
    			attr_dev(span8, "class", "show-time-custome");
    			add_location(span8, file$8, 280, 64, 25284);
    			attr_dev(div42, "class", "cu-intro mt-2");
    			add_location(div42, file$8, 278, 60, 24979);
    			attr_dev(div43, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-0 pr-md-4 mr-lg-2 mr-xl-0 pr-xl-3 justify-content-center custome-margin-right ");
    			add_location(div43, file$8, 277, 56, 24796);
    			attr_dev(div44, "class", "row ");
    			add_location(div44, file$8, 273, 52, 24417);
    			attr_dev(div45, "class", "col-11 col-md-11");
    			add_location(div45, file$8, 272, 48, 24333);
    			attr_dev(i17, "class", "fas fa-ellipsis-h -1 ");
    			attr_dev(i17, "type", "button");
    			attr_dev(i17, "data-toggle", "dropdown");
    			add_location(i17, file$8, 286, 52, 25783);
    			attr_dev(i18, "class", "far fa-bookmark");
    			add_location(i18, file$8, 288, 136, 26087);
    			attr_dev(a16, "class", "dropdown-item");
    			attr_dev(a16, "href", "#");
    			add_location(a16, file$8, 288, 101, 26052);
    			add_location(li8, file$8, 288, 56, 26007);
    			attr_dev(i19, "class", "fas fa-share-alt");
    			add_location(i19, file$8, 289, 94, 26238);
    			attr_dev(a17, "class", "dropdown-item");
    			attr_dev(a17, "href", "#");
    			add_location(a17, file$8, 289, 60, 26204);
    			add_location(li9, file$8, 289, 56, 26200);
    			attr_dev(i20, "class", "fas fa-flag");
    			add_location(i20, file$8, 290, 94, 26389);
    			attr_dev(a18, "class", "dropdown-item");
    			attr_dev(a18, "href", "#");
    			add_location(a18, file$8, 290, 60, 26355);
    			add_location(li10, file$8, 290, 56, 26351);
    			attr_dev(ul3, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul3, file$8, 287, 52, 25910);
    			attr_dev(div46, "class", "report dropdown col-1 ml-0 pl-0 pr-3 navbar pr-md-3 pr-lg-4 ");
    			add_location(div46, file$8, 285, 48, 25656);
    			attr_dev(div47, "class", "row justify-content-between p-2 pl-4 pl-md-2");
    			add_location(div47, file$8, 271, 44, 24226);
    			attr_dev(div48, "class", "col-12");
    			add_location(div48, file$8, 270, 40, 24161);
    			attr_dev(a19, "class", "title-post-link");
    			attr_dev(a19, "href", "magezine/show-detail");
    			add_location(a19, file$8, 297, 88, 26842);
    			attr_dev(h32, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h32, file$8, 297, 44, 26798);
    			attr_dev(div49, "class", "col-12 p-0");
    			add_location(div49, file$8, 296, 40, 26729);
    			if (img8.src !== (img8_src_value = "image/30.jpg")) attr_dev(img8, "src", img8_src_value);
    			attr_dev(img8, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img8, "alt", "");
    			add_location(img8, file$8, 300, 44, 27118);
    			attr_dev(div50, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div50, file$8, 299, 40, 27016);
    			attr_dev(span9, "class", "content d-inline");
    			add_location(span9, file$8, 304, 44, 27417);
    			attr_dev(span10, "class", "read-more-custom");
    			attr_dev(span10, "onclick", "readMore(this)");
    			set_style(span10, "cursor", "pointer");
    			add_location(span10, file$8, 316, 44, 30941);
    			attr_dev(button4, "class", "btn btn-sm btn-danger col-12 my-1 p-1 offset-0 font-family");
    			add_location(button4, file$8, 320, 56, 31383);
    			attr_dev(a20, "href", "magezine/show-detail");
    			attr_dev(a20, "class", "col-3 col-md-2 px-0");
    			add_location(a20, file$8, 319, 52, 31267);
    			attr_dev(div51, "class", "row pl-0 ml-0 pt-2 justify-content-end ");
    			add_location(div51, file$8, 318, 48, 31161);
    			attr_dev(span11, "class", "read-more ");
    			add_location(span11, file$8, 317, 44, 31087);
    			attr_dev(p2, "class", "post-text col-12 mt-3 post-text");
    			add_location(p2, file$8, 303, 40, 27329);
    			attr_dev(i21, "class", "fas fa-eye");
    			add_location(i21, file$8, 328, 68, 31932);
    			attr_dev(div52, "class", "view-count");
    			add_location(div52, file$8, 328, 44, 31908);
    			attr_dev(div53, "class", "col-12 mb-1 author-show-box pt-1");
    			add_location(div53, file$8, 326, 40, 31772);
    			attr_dev(article2, "class", "p-0  shadow-radius-section shadow-section mb-4 bg-light");
    			add_location(article2, file$8, 269, 36, 24047);
    			attr_dev(div54, "class", "col-12 p-0 main-article ");
    			add_location(div54, file$8, 144, 32, 7870);
    			attr_dev(section, "class", "row mx-0 mt-3 mr-0 pt-0  ");
    			add_location(section, file$8, 143, 28, 7794);
    			attr_dev(aside1, "class", "col-12 col-md-9 order-first justify-content-between order-md-0 mx-0 ");
    			add_location(aside1, file$8, 142, 24, 7681);
    			attr_dev(img9, "class", " header-image-person-sidebar bg-light");
    			if (img9.src !== (img9_src_value = "image/head.jpeg")) attr_dev(img9, "src", img9_src_value);
    			attr_dev(img9, "alt", "");
    			add_location(img9, file$8, 337, 36, 32509);
    			attr_dev(div55, "class", "col-12 p-0 banner-sidebar");
    			add_location(div55, file$8, 336, 32, 32432);
    			attr_dev(img10, "class", "header-logo-image-person-sidebar border-radius");
    			if (img10.src !== (img10_src_value = "image/1.jpeg")) attr_dev(img10, "src", img10_src_value);
    			attr_dev(img10, "alt", "");
    			add_location(img10, file$8, 340, 36, 32750);
    			attr_dev(div56, "class", "col-12 header-image-main border-radius");
    			add_location(div56, file$8, 339, 32, 32661);
    			attr_dev(h65, "class", "text-bold ");
    			add_location(h65, file$8, 345, 44, 33108);
    			attr_dev(h66, "class", "explain-about-page-sidebar pt-3");
    			add_location(h66, file$8, 346, 44, 33289);
    			attr_dev(button5, "class", "px-0 mx-0 btn-sm col-12 font btn btn-danger text-white rounded-circle rounded-pill");
    			add_location(button5, file$8, 350, 52, 33777);
    			attr_dev(a21, "href", "#");
    			add_location(a21, file$8, 349, 48, 33712);
    			attr_dev(div57, "class", "col-12 mt-4 font mx-0 px-0");
    			add_location(div57, file$8, 347, 44, 33529);
    			attr_dev(div58, "class", "col-10 ");
    			add_location(div58, file$8, 344, 40, 33042);
    			attr_dev(div59, "class", "row");
    			add_location(div59, file$8, 343, 36, 32984);
    			attr_dev(div60, "class", "header-detail col-12 pb-3");
    			add_location(div60, file$8, 342, 32, 32908);
    			attr_dev(div61, "class", div61_class_value = "" + ((/*y*/ ctx[0] > 100 ? "sticky-top-show-detail-aside" : "") + " row px-0 text-center shadow-radius-section bg-light "));
    			toggle_class(div61, "d-none", /*x*/ ctx[1] <= 767);
    			add_location(div61, file$8, 335, 28, 32265);
    			attr_dev(aside2, "class", " col-12 col-md-3 mt-3 ");
    			add_location(aside2, file$8, 334, 24, 32197);
    			attr_dev(div62, "class", "row px-0 mx-0");
    			add_location(div62, file$8, 141, 20, 7628);
    			attr_dev(div63, "id", "post");
    			attr_dev(div63, "class", "row ");
    			add_location(div63, file$8, 140, 16, 7579);
    			attr_dev(div64, "class", "w-100 mr-0");
    			add_location(div64, file$8, 139, 12, 7538);
    			attr_dev(aside3, "class", "col-12 col-lg-8  ");
    			add_location(aside3, file$8, 94, 8, 3886);
    			attr_dev(div65, "class", "row justify-content-center mx-0");
    			add_location(div65, file$8, 79, 4, 3242);
    			attr_dev(main, "class", "container-fluid pin-parent px-0");
    			add_location(main, file$8, 77, 0, 3169);
    			add_location(br0, file$8, 380, 0, 35186);
    			add_location(br1, file$8, 380, 4, 35190);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div65);
    			append_dev(div65, aside0);
    			append_dev(aside0, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, a0);
    			append_dev(a0, img0);
    			append_dev(div65, t0);
    			append_dev(div65, aside3);
    			append_dev(aside3, div14);
    			append_dev(div14, div13);
    			append_dev(div13, div12);
    			append_dev(div12, div4);
    			append_dev(div4, img1);
    			append_dev(div12, t1);
    			append_dev(div12, div5);
    			append_dev(div5, img2);
    			append_dev(div12, t2);
    			append_dev(div12, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div9);
    			append_dev(div9, h4);
    			append_dev(div9, t4);
    			append_dev(div9, h60);
    			append_dev(h60, i0);
    			append_dev(h60, t5);
    			append_dev(div9, t6);
    			append_dev(div9, h61);
    			append_dev(div9, t8);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, button0);
    			append_dev(button0, i1);
    			append_dev(button0, t9);
    			append_dev(div7, t10);
    			append_dev(div7, div6);
    			append_dev(div6, button1);
    			append_dev(div6, t12);
    			append_dev(div6, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a1);
    			append_dev(a1, i2);
    			append_dev(a1, t13);
    			append_dev(ul0, t14);
    			append_dev(ul0, li1);
    			append_dev(li1, a2);
    			append_dev(a2, i3);
    			append_dev(a2, t15);
    			append_dev(aside3, t16);
    			append_dev(aside3, div64);
    			append_dev(div64, div63);
    			append_dev(div63, div62);
    			append_dev(div62, aside1);
    			append_dev(aside1, section);
    			append_dev(section, div54);
    			append_dev(div54, article0);
    			append_dev(article0, div22);
    			append_dev(div22, div21);
    			append_dev(div21, div19);
    			append_dev(div19, div18);
    			append_dev(div18, div15);
    			append_dev(div15, img3);
    			append_dev(div18, t17);
    			append_dev(div18, div17);
    			append_dev(div17, div16);
    			append_dev(div16, h62);
    			append_dev(h62, a3);
    			append_dev(div16, t19);
    			append_dev(div16, span0);
    			append_dev(span0, i4);
    			append_dev(span0, t20);
    			append_dev(div21, t21);
    			append_dev(div21, div20);
    			append_dev(div20, i5);
    			append_dev(div20, t22);
    			append_dev(div20, ul1);
    			append_dev(ul1, li2);
    			append_dev(li2, a4);
    			append_dev(a4, i6);
    			append_dev(a4, t23);
    			append_dev(ul1, t24);
    			append_dev(ul1, li3);
    			append_dev(li3, a5);
    			append_dev(a5, i7);
    			append_dev(a5, t25);
    			append_dev(ul1, t26);
    			append_dev(ul1, li4);
    			append_dev(li4, a6);
    			append_dev(a6, i8);
    			append_dev(a6, t27);
    			append_dev(article0, t28);
    			append_dev(article0, div23);
    			append_dev(div23, h30);
    			append_dev(h30, a7);
    			append_dev(article0, t30);
    			append_dev(article0, div24);
    			append_dev(div24, img4);
    			append_dev(article0, t31);
    			append_dev(article0, p0);
    			append_dev(p0, span1);
    			append_dev(p0, t33);
    			append_dev(p0, span2);
    			append_dev(p0, t35);
    			append_dev(p0, span3);
    			append_dev(span3, div25);
    			append_dev(div25, a8);
    			append_dev(a8, button2);
    			append_dev(article0, t37);
    			append_dev(article0, div27);
    			append_dev(div27, div26);
    			append_dev(div26, i9);
    			append_dev(div26, t38);
    			append_dev(div54, t39);
    			append_dev(div54, article1);
    			append_dev(article1, div35);
    			append_dev(div35, div34);
    			append_dev(div34, div32);
    			append_dev(div32, div31);
    			append_dev(div31, div28);
    			append_dev(div28, img5);
    			append_dev(div31, t40);
    			append_dev(div31, div30);
    			append_dev(div30, div29);
    			append_dev(div29, h63);
    			append_dev(h63, a9);
    			append_dev(div29, t42);
    			append_dev(div29, span4);
    			append_dev(span4, i10);
    			append_dev(span4, t43);
    			append_dev(div34, t44);
    			append_dev(div34, div33);
    			append_dev(div33, i11);
    			append_dev(div33, t45);
    			append_dev(div33, ul2);
    			append_dev(ul2, li5);
    			append_dev(li5, a10);
    			append_dev(a10, i12);
    			append_dev(a10, t46);
    			append_dev(ul2, t47);
    			append_dev(ul2, li6);
    			append_dev(li6, a11);
    			append_dev(a11, i13);
    			append_dev(a11, t48);
    			append_dev(ul2, t49);
    			append_dev(ul2, li7);
    			append_dev(li7, a12);
    			append_dev(a12, i14);
    			append_dev(a12, t50);
    			append_dev(article1, t51);
    			append_dev(article1, div36);
    			append_dev(div36, h31);
    			append_dev(h31, a13);
    			append_dev(article1, t53);
    			append_dev(article1, div37);
    			append_dev(div37, img6);
    			append_dev(article1, t54);
    			append_dev(article1, p1);
    			append_dev(p1, span5);
    			append_dev(p1, t56);
    			append_dev(p1, span6);
    			append_dev(p1, t58);
    			append_dev(p1, span7);
    			append_dev(span7, div38);
    			append_dev(div38, a14);
    			append_dev(a14, button3);
    			append_dev(article1, t60);
    			append_dev(article1, div40);
    			append_dev(div40, div39);
    			append_dev(div39, i15);
    			append_dev(div39, t61);
    			append_dev(div54, t62);
    			append_dev(div54, article2);
    			append_dev(article2, div48);
    			append_dev(div48, div47);
    			append_dev(div47, div45);
    			append_dev(div45, div44);
    			append_dev(div44, div41);
    			append_dev(div41, img7);
    			append_dev(div44, t63);
    			append_dev(div44, div43);
    			append_dev(div43, div42);
    			append_dev(div42, h64);
    			append_dev(h64, a15);
    			append_dev(div42, t65);
    			append_dev(div42, span8);
    			append_dev(span8, i16);
    			append_dev(span8, t66);
    			append_dev(div47, t67);
    			append_dev(div47, div46);
    			append_dev(div46, i17);
    			append_dev(div46, t68);
    			append_dev(div46, ul3);
    			append_dev(ul3, li8);
    			append_dev(li8, a16);
    			append_dev(a16, i18);
    			append_dev(a16, t69);
    			append_dev(ul3, t70);
    			append_dev(ul3, li9);
    			append_dev(li9, a17);
    			append_dev(a17, i19);
    			append_dev(a17, t71);
    			append_dev(ul3, t72);
    			append_dev(ul3, li10);
    			append_dev(li10, a18);
    			append_dev(a18, i20);
    			append_dev(a18, t73);
    			append_dev(article2, t74);
    			append_dev(article2, div49);
    			append_dev(div49, h32);
    			append_dev(h32, a19);
    			append_dev(article2, t76);
    			append_dev(article2, div50);
    			append_dev(div50, img8);
    			append_dev(article2, t77);
    			append_dev(article2, p2);
    			append_dev(p2, span9);
    			append_dev(p2, t79);
    			append_dev(p2, span10);
    			append_dev(p2, t81);
    			append_dev(p2, span11);
    			append_dev(span11, div51);
    			append_dev(div51, a20);
    			append_dev(a20, button4);
    			append_dev(article2, t83);
    			append_dev(article2, div53);
    			append_dev(div53, div52);
    			append_dev(div52, i21);
    			append_dev(div52, t84);
    			append_dev(div62, t85);
    			append_dev(div62, aside2);
    			append_dev(aside2, div61);
    			append_dev(div61, div55);
    			append_dev(div55, img9);
    			append_dev(div61, t86);
    			append_dev(div61, div56);
    			append_dev(div56, img10);
    			append_dev(div61, t87);
    			append_dev(div61, div60);
    			append_dev(div60, div59);
    			append_dev(div59, div58);
    			append_dev(div58, h65);
    			append_dev(div58, t89);
    			append_dev(div58, h66);
    			append_dev(div58, t91);
    			append_dev(div58, div57);
    			append_dev(div57, a21);
    			append_dev(a21, button5);
    			insert_dev(target, t93, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, br1, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*x*/ 2 && div6_class_value !== (div6_class_value = "" + ((/*x*/ ctx[1] <= 320 ? "col-12" : "col-5") + " col-md-3 justify-content-start navbar dropdown dropleft pr-1"))) {
    				attr_dev(div6, "class", div6_class_value);
    			}

    			if (!current || dirty & /*y*/ 1 && div61_class_value !== (div61_class_value = "" + ((/*y*/ ctx[0] > 100 ? "sticky-top-show-detail-aside" : "") + " row px-0 text-center shadow-radius-section bg-light "))) {
    				attr_dev(div61, "class", div61_class_value);
    			}

    			if (dirty & /*y, x*/ 3) {
    				toggle_class(div61, "d-none", /*x*/ ctx[1] <= 767);
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
    			if (detaching) detach_dev(main);
    			if (detaching && main_transition) main_transition.end();
    			if (detaching) detach_dev(t93);
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

    function create_fragment$8(ctx) {
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
    					listen_dev(window_1$5, "scroll", () => {
    						scrolling = true;
    						clearTimeout(scrolling_timeout);
    						scrolling_timeout = setTimeout(clear_scrolling, 100);
    						/*onwindowscroll*/ ctx[3]();
    					}),
    					listen_dev(window_1$5, "resize", /*onwindowresize*/ ctx[4])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*y*/ 1 && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window_1$5.pageXOffset, /*y*/ ctx[0]);
    				scrolling_timeout = setTimeout(clear_scrolling, 100);
    			}

    			const router_changes = {};
    			if (dirty & /*url*/ 4) router_changes.url = /*url*/ ctx[2];

    			if (dirty & /*$$scope, y, x*/ 16387) {
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
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Profile", slots, []);
    	let { url = "" } = $$props;
    	let { y } = $$props;
    	let { x } = $$props;

    	//$: console.log(x);
    	const urlParams = new URLSearchParams(window.location.search);

    	const id = urlParams.has("id");

    	//console.log(id);
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
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Profile> was created with unknown prop '${key}'`);
    	});

    	function onwindowscroll() {
    		$$invalidate(0, y = window_1$5.pageYOffset);
    	}

    	function onwindowresize() {
    		$$invalidate(1, x = window_1$5.innerWidth);
    	}

    	$$self.$$set = $$props => {
    		if ("url" in $$props) $$invalidate(2, url = $$props.url);
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    		if ("x" in $$props) $$invalidate(1, x = $$props.x);
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
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    		if ("x" in $$props) $$invalidate(1, x = $$props.x);
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

    	return [y, x, url, onwindowscroll, onwindowresize];
    }

    class Profile extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { url: 2, y: 0, x: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Profile",
    			options,
    			id: create_fragment$8.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*y*/ ctx[0] === undefined && !("y" in props)) {
    			console.warn("<Profile> was created without expected prop 'y'");
    		}

    		if (/*x*/ ctx[1] === undefined && !("x" in props)) {
    			console.warn("<Profile> was created without expected prop 'x'");
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

    const { console: console_1, window: window_1$4 } = globals;
    const file$7 = "src/pages/magezine.svelte";

    // (76:0) {#if y>450}
    function create_if_block_1$2(ctx) {
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
    			a2.textContent = "درباره";
    			t12 = space();
    			li3 = element("li");
    			a3 = element("a");
    			a3.textContent = "پست";
    			attr_dev(i0, "class", "fas fa-external-link-alt padding-button ml-2 icon-size-scroll");
    			add_location(i0, file$7, 82, 100, 2805);
    			attr_dev(button0, "class", "btn rounded-pill font btn-mw-scroll text-center visit-btn mx-0 ");
    			add_location(button0, file$7, 82, 20, 2725);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "data-toggle", "dropdown");
    			attr_dev(button1, "class", "pt-0 pl-md-3 pr-md-3 px-lg-3 btn btn-sm btn-mw-scroll rounded-pill col-12 font text-center col-md-7 mr-2");
    			add_location(button1, file$7, 85, 24, 3031);
    			attr_dev(i1, "class", "fas fa-share-alt");
    			add_location(i1, file$7, 89, 66, 3392);
    			attr_dev(a0, "href", "#");
    			add_location(a0, file$7, 89, 54, 3380);
    			attr_dev(li0, "class", "dropdown-item");
    			add_location(li0, file$7, 89, 28, 3354);
    			attr_dev(i2, "class", "fas fa-flag");
    			add_location(i2, file$7, 90, 66, 3513);
    			attr_dev(a1, "href", "#");
    			add_location(a1, file$7, 90, 54, 3501);
    			attr_dev(li1, "class", "dropdown-item");
    			add_location(li1, file$7, 90, 28, 3475);
    			attr_dev(ul0, "class", "dropdown-menu  ellipsis-menu ml-2");
    			add_location(ul0, file$7, 88, 24, 3279);
    			attr_dev(div0, "class", "navbar-scroll col-5 mr-0 justify-content-start navbar dropleft px-2");
    			add_location(div0, file$7, 84, 20, 2925);
    			attr_dev(div1, "class", "row justify-content-end vm-navbar");
    			add_location(div1, file$7, 81, 16, 2657);
    			attr_dev(div2, "class", "col-8 col-md-4 direction my-auto");
    			add_location(div2, file$7, 80, 12, 2593);
    			if (img.src !== (img_src_value = "image/afarine.jpg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "logo-cu-scroll");
    			attr_dev(img, "alt", "");
    			add_location(img, file$7, 98, 24, 3847);
    			attr_dev(div3, "class", "col-1 mr-3  my-auto");
    			add_location(div3, file$7, 97, 20, 3789);
    			set_style(i3, "color", "#048af7");
    			set_style(i3, "font-size", "13px");
    			attr_dev(i3, "class", "fas fa-check-circle");
    			add_location(i3, file$7, 101, 75, 4050);
    			attr_dev(h5, "class", "text-logo-scroll mt-2 mr-2");
    			add_location(h5, file$7, 101, 24, 3999);
    			attr_dev(div4, "class", "col-10");
    			add_location(div4, file$7, 100, 20, 3954);
    			attr_dev(div5, "class", "row mr-3 ");
    			add_location(div5, file$7, 96, 16, 3745);
    			attr_dev(div6, "class", "col-6  col-md-5 bg-light py-2  direction ");
    			add_location(div6, file$7, 95, 12, 3672);
    			attr_dev(div7, "class", "row justify-content-between shadow-sm mr-0");
    			add_location(div7, file$7, 79, 8, 2524);
    			attr_dev(a2, "class", "py-2 nav-link-scroll");
    			attr_dev(a2, "data-toggle", "tab");
    			attr_dev(a2, "href", "#about");
    			toggle_class(a2, "active", /*current*/ ctx[4] === "about");
    			add_location(a2, file$7, 109, 53, 4454);
    			attr_dev(li2, "class", "nav-item-scroll mt-2");
    			add_location(li2, file$7, 109, 20, 4421);
    			attr_dev(a3, "class", "py-2 nav-link-scroll");
    			attr_dev(a3, "data-toggle", "tab");
    			attr_dev(a3, "href", "#post");
    			toggle_class(a3, "active", /*current*/ ctx[4] === "post");
    			add_location(a3, file$7, 110, 53, 4658);
    			attr_dev(li3, "class", "nav-item-scroll mt-2");
    			add_location(li3, file$7, 110, 20, 4625);
    			attr_dev(ul1, "class", "nav nav-tabs direction text-center");
    			attr_dev(ul1, "role", "tablist");
    			add_location(ul1, file$7, 108, 16, 4338);
    			attr_dev(div8, "class", "row  mx-4 scroll-main-height");
    			add_location(div8, file$7, 107, 12, 4279);
    			attr_dev(div9, "class", "col-12 mt-0 scroll-main-height");
    			add_location(div9, file$7, 106, 8, 4222);
    			attr_dev(div10, "class", "col-12 scroll-div bg-light pr-0 mr-5 nav-custome-top");
    			add_location(div10, file$7, 78, 4, 2432);
    			attr_dev(section, "class", "row nav-mag-scroll pr-0 mr-0 bg-light mt-0 d-none d-md-inline");
    			add_location(section, file$7, 76, 0, 2341);
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
    					listen_dev(a2, "click", /*click_handler*/ ctx[7], false, false, false),
    					listen_dev(a3, "click", /*click_handler_1*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*current*/ 16) {
    				toggle_class(a2, "active", /*current*/ ctx[4] === "about");
    			}

    			if (dirty & /*current*/ 16) {
    				toggle_class(a3, "active", /*current*/ ctx[4] === "post");
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
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(76:0) {#if y>450}",
    		ctx
    	});

    	return block;
    }

    // (421:40) {#if x<=767}
    function create_if_block$4(ctx) {
    	let button;
    	let span;

    	const block = {
    		c: function create() {
    			button = element("button");
    			span = element("span");
    			span.textContent = "×";
    			attr_dev(span, "class", "col-1 mt-1");
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file$7, 425, 48, 37712);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "close row mx-2 justify-content-end");
    			attr_dev(button, "data-dismiss", "modal");
    			attr_dev(button, "aria-label", "Close");
    			add_location(button, file$7, 421, 44, 37447);
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
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(421:40) {#if x<=767}",
    		ctx
    	});

    	return block;
    }

    // (74:0) <Router url="{url}">
    function create_default_slot$1(ctx) {
    	let t0;
    	let main;
    	let div165;
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
    	let h4;
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
    	let div6_class_value;
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
    	let div164;
    	let div142;
    	let div141;
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
    	let h30;
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
    	let h31;
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
    	let h32;
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
    	let h33;
    	let t105;
    	let h65;
    	let t107;
    	let div140;
    	let div138;
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
    	let div137;
    	let div136;
    	let t111;
    	let div115;
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
    	let div88;
    	let h510;
    	let a42;
    	let t144;
    	let a43;
    	let p13;
    	let t146;
    	let div114;
    	let div113;
    	let div112;
    	let div111;
    	let div110;
    	let div89;
    	let h511;
    	let a44;
    	let t147;
    	let a45;
    	let p14;
    	let t149;
    	let div92;
    	let div91;
    	let div90;
    	let h512;
    	let i32;
    	let t150;
    	let a46;
    	let p15;
    	let t152;
    	let div96;
    	let div93;
    	let h513;
    	let a47;
    	let t153;
    	let a48;
    	let p16;
    	let t155;
    	let div95;
    	let div94;
    	let h514;
    	let i33;
    	let t156;
    	let a49;
    	let p17;
    	let t158;
    	let div109;
    	let div97;
    	let h515;
    	let a50;
    	let t159;
    	let a51;
    	let p18;
    	let t161;
    	let div108;
    	let div107;
    	let div106;
    	let div105;
    	let div101;
    	let div98;
    	let h516;
    	let a52;
    	let t162;
    	let a53;
    	let p19;
    	let t164;
    	let div100;
    	let div99;
    	let h517;
    	let i34;
    	let t165;
    	let a54;
    	let p20;
    	let t167;
    	let div102;
    	let h518;
    	let i35;
    	let t168;
    	let a55;
    	let p21;
    	let t170;
    	let div104;
    	let div103;
    	let t172;
    	let div119;
    	let div116;
    	let h519;
    	let a56;
    	let t173;
    	let a57;
    	let p22;
    	let t175;
    	let div118;
    	let div117;
    	let h520;
    	let i36;
    	let t176;
    	let a58;
    	let p23;
    	let t178;
    	let div123;
    	let div120;
    	let h521;
    	let a59;
    	let t179;
    	let a60;
    	let p24;
    	let t181;
    	let div122;
    	let div121;
    	let h522;
    	let i37;
    	let t182;
    	let a61;
    	let p25;
    	let t184;
    	let div127;
    	let div124;
    	let h523;
    	let a62;
    	let t185;
    	let a63;
    	let p26;
    	let t187;
    	let div126;
    	let div125;
    	let h524;
    	let i38;
    	let t188;
    	let a64;
    	let p27;
    	let t190;
    	let div131;
    	let div128;
    	let h525;
    	let a65;
    	let t191;
    	let a66;
    	let p28;
    	let t193;
    	let div130;
    	let div129;
    	let h526;
    	let i39;
    	let t194;
    	let a67;
    	let p29;
    	let t196;
    	let div135;
    	let div132;
    	let h527;
    	let a68;
    	let t197;
    	let a69;
    	let p30;
    	let t199;
    	let div134;
    	let div133;
    	let h528;
    	let i40;
    	let t200;
    	let a70;
    	let p31;
    	let div136_class_value;
    	let div136_role_value;
    	let div137_class_value;
    	let div137_id_value;
    	let div137_tabindex_value;
    	let div137_role_value;
    	let div138_class_value;
    	let t202;
    	let div139;
    	let div140_class_value;
    	let t203;
    	let div163;
    	let div162;
    	let div158;
    	let div157;
    	let h529;
    	let t205;
    	let p32;
    	let t207;
    	let div156;
    	let div155;
    	let div143;
    	let t209;
    	let div144;
    	let a71;
    	let t211;
    	let div145;
    	let t213;
    	let div146;
    	let t215;
    	let div147;
    	let t217;
    	let div148;
    	let t219;
    	let div149;
    	let t221;
    	let div150;
    	let t223;
    	let div151;
    	let t225;
    	let div152;
    	let t227;
    	let div153;
    	let t229;
    	let div154;
    	let t231;
    	let div161;
    	let div160;
    	let h530;
    	let t233;
    	let p33;
    	let t235;
    	let div159;
    	let main_transition;
    	let t236;
    	let br0;
    	let br1;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block0 = /*y*/ ctx[0] > 450 && create_if_block_1$2(ctx);
    	let if_block1 = /*x*/ ctx[1] <= 767 && create_if_block$4(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			main = element("main");
    			div165 = element("div");
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
    			h4 = element("h4");
    			t4 = text("آفرینه ");
    			i0 = element("i");
    			t5 = space();
    			h60 = element("h6");
    			i1 = element("i");
    			t6 = text(" تهران,میدان شیخ بهایی,ساختمان اوستا");
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
    			a3.textContent = "درباره";
    			t19 = space();
    			li3 = element("li");
    			a4 = element("a");
    			a4.textContent = "پست";
    			t21 = space();
    			div164 = element("div");
    			div142 = element("div");
    			div141 = element("div");
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
    			h30 = element("h3");
    			a9 = element("a");
    			a9.textContent = "به اینولینکس خوش آمدید";
    			t35 = space();
    			div26 = element("div");
    			img4 = element("img");
    			t36 = space();
    			p0 = element("p");
    			span1 = element("span");
    			span1.textContent = "طراحان سایت هنگام طراحی قالب سایت معمولا با این موضوع رو برو هستند که محتوای اصلی صفحات آماده نیست. در نتیجه طرح کلی دید درستی به کار فرما نمیدهد. اگر طراح بخواهد دنبال متن های مرتبط بگردد تمرکزش از روی کار اصلی برداشته میشود و اینکار زمان بر خواهد بود. همچنین طراح به دنبال این است که پس از ارایه کار نظر دیگران را در مورد طراحی جویا شود و نمی‌خواهد افراد روی متن های موجود تمرکز کنند.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                نکته بعدی در مورد متن ساختگی لورم ایپسوم این است که بعضی از طراحان وبسایت و گرافیست کاران بعد از آنکه قالب و محتوای مورد نظرشون را ایجاد کردند از یاد می‌برند که متن لورم را از قسمتهای مختلف .";
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
    			h31 = element("h3");
    			a16 = element("a");
    			a16.textContent = "به اینولینکس خوش آمدید";
    			t62 = space();
    			div39 = element("div");
    			img7 = element("img");
    			t63 = space();
    			p1 = element("p");
    			span6 = element("span");
    			span6.textContent = "طراحان سایت هنگام طراحی قالب سایت معمولا با این موضوع رو برو هستند که محتوای اصلی صفحات آماده نیست. در نتیجه طرح کلی دید درستی به کار فرما نمیدهد. اگر طراح بخواهد دنبال متن های مرتبط بگردد تمرکزش از روی کار اصلی برداشته میشود و اینکار زمان بر خواهد بود. همچنین طراح به دنبال این است که پس از ارایه کار نظر دیگران را در مورد طراحی جویا شود و نمی‌خواهد افراد روی متن های موجود تمرکز کنند.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                نکته بعدی در مورد متن ساختگی لورم ایپسوم این است که بعضی از طراحان وبسایت و گرافیست کاران بعد از آنکه قالب و محتوای مورد نظرشون را ایجاد کردند از یاد می‌برند که متن لورم را از قسمتهای مختلف .";
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
    			h32 = element("h3");
    			a23 = element("a");
    			a23.textContent = "به اینولینکس خوش آمدید";
    			t89 = space();
    			div52 = element("div");
    			img10 = element("img");
    			t90 = space();
    			p2 = element("p");
    			span11 = element("span");
    			span11.textContent = "طراحان سایت هنگام طراحی قالب سایت معمولا با این موضوع رو برو هستند که محتوای اصلی صفحات آماده نیست. در نتیجه طرح کلی دید درستی به کار فرما نمیدهد. اگر طراح بخواهد دنبال متن های مرتبط بگردد تمرکزش از روی کار اصلی برداشته میشود و اینکار زمان بر خواهد بود. همچنین طراح به دنبال این است که پس از ارایه کار نظر دیگران را در مورد طراحی جویا شود و نمی‌خواهد افراد روی متن های موجود تمرکز کنند.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                از آنجا که لورم ایپسوم، شباهت زیادی به متن های واقعی دارد، طراحان معمولا از لورم ایپسوم استفاده میکنند تا فقط به مشتری یا کار فرما نشان دهند که قالب طراحی شده بعد از اینکه متن در آن قرار میگرد چگونه خواهد بود و فونت ها و اندازه ها چگونه در نظر گرفته شده است.\n                                                نکته بعدی در مورد متن ساختگی لورم ایپسوم این است که بعضی از طراحان وبسایت و گرافیست کاران بعد از آنکه قالب و محتوای مورد نظرشون را ایجاد کردند از یاد می‌برند که متن لورم را از قسمتهای مختلف .";
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
    			h33 = element("h3");
    			h33.textContent = "آفرینه";
    			t105 = space();
    			h65 = element("h6");
    			h65.textContent = "زندگی به سبک نوآوری";
    			t107 = space();
    			div140 = element("div");
    			div138 = element("div");
    			div59 = element("div");
    			a26 = element("a");
    			i26 = element("i");
    			t108 = space();
    			span15 = element("span");
    			span15.textContent = "دسته بندی";
    			t110 = space();
    			div137 = element("div");
    			div136 = element("div");
    			if (if_block1) if_block1.c();
    			t111 = space();
    			div115 = element("div");
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
    			div88 = element("div");
    			h510 = element("h5");
    			a42 = element("a");
    			t144 = space();
    			a43 = element("a");
    			p13 = element("p");
    			p13.textContent = "بازاریابی";
    			t146 = space();
    			div114 = element("div");
    			div113 = element("div");
    			div112 = element("div");
    			div111 = element("div");
    			div110 = element("div");
    			div89 = element("div");
    			h511 = element("h5");
    			a44 = element("a");
    			t147 = space();
    			a45 = element("a");
    			p14 = element("p");
    			p14.textContent = "کسب و کار";
    			t149 = space();
    			div92 = element("div");
    			div91 = element("div");
    			div90 = element("div");
    			h512 = element("h5");
    			i32 = element("i");
    			t150 = space();
    			a46 = element("a");
    			p15 = element("p");
    			p15.textContent = "ورزش";
    			t152 = space();
    			div96 = element("div");
    			div93 = element("div");
    			h513 = element("h5");
    			a47 = element("a");
    			t153 = space();
    			a48 = element("a");
    			p16 = element("p");
    			p16.textContent = "مدیریت تکنولوژی";
    			t155 = space();
    			div95 = element("div");
    			div94 = element("div");
    			h514 = element("h5");
    			i33 = element("i");
    			t156 = space();
    			a49 = element("a");
    			p17 = element("p");
    			p17.textContent = "خاورمیانه";
    			t158 = space();
    			div109 = element("div");
    			div97 = element("div");
    			h515 = element("h5");
    			a50 = element("a");
    			t159 = space();
    			a51 = element("a");
    			p18 = element("p");
    			p18.textContent = "آرشیو کلیپ ها";
    			t161 = space();
    			div108 = element("div");
    			div107 = element("div");
    			div106 = element("div");
    			div105 = element("div");
    			div101 = element("div");
    			div98 = element("div");
    			h516 = element("h5");
    			a52 = element("a");
    			t162 = space();
    			a53 = element("a");
    			p19 = element("p");
    			p19.textContent = "کسب و کار";
    			t164 = space();
    			div100 = element("div");
    			div99 = element("div");
    			h517 = element("h5");
    			i34 = element("i");
    			t165 = space();
    			a54 = element("a");
    			p20 = element("p");
    			p20.textContent = "فوتبال";
    			t167 = space();
    			div102 = element("div");
    			h518 = element("h5");
    			i35 = element("i");
    			t168 = space();
    			a55 = element("a");
    			p21 = element("p");
    			p21.textContent = "خاورمیانه";
    			t170 = space();
    			div104 = element("div");
    			div103 = element("div");
    			div103.textContent = "خاورمیانه";
    			t172 = space();
    			div119 = element("div");
    			div116 = element("div");
    			h519 = element("h5");
    			a56 = element("a");
    			t173 = space();
    			a57 = element("a");
    			p22 = element("p");
    			p22.textContent = "مدیریت تلکنولوژی";
    			t175 = space();
    			div118 = element("div");
    			div117 = element("div");
    			h520 = element("h5");
    			i36 = element("i");
    			t176 = space();
    			a58 = element("a");
    			p23 = element("p");
    			p23.textContent = "خاورمیانه";
    			t178 = space();
    			div123 = element("div");
    			div120 = element("div");
    			h521 = element("h5");
    			a59 = element("a");
    			t179 = space();
    			a60 = element("a");
    			p24 = element("p");
    			p24.textContent = "آرشیو کلیپ ها";
    			t181 = space();
    			div122 = element("div");
    			div121 = element("div");
    			h522 = element("h5");
    			i37 = element("i");
    			t182 = space();
    			a61 = element("a");
    			p25 = element("p");
    			p25.textContent = "راهیان نور";
    			t184 = space();
    			div127 = element("div");
    			div124 = element("div");
    			h523 = element("h5");
    			a62 = element("a");
    			t185 = space();
    			a63 = element("a");
    			p26 = element("p");
    			p26.textContent = "آرشیو کلیپ ها";
    			t187 = space();
    			div126 = element("div");
    			div125 = element("div");
    			h524 = element("h5");
    			i38 = element("i");
    			t188 = space();
    			a64 = element("a");
    			p27 = element("p");
    			p27.textContent = "راهیان نور";
    			t190 = space();
    			div131 = element("div");
    			div128 = element("div");
    			h525 = element("h5");
    			a65 = element("a");
    			t191 = space();
    			a66 = element("a");
    			p28 = element("p");
    			p28.textContent = "آرشیو کلیپ ها";
    			t193 = space();
    			div130 = element("div");
    			div129 = element("div");
    			h526 = element("h5");
    			i39 = element("i");
    			t194 = space();
    			a67 = element("a");
    			p29 = element("p");
    			p29.textContent = "راهیان نور";
    			t196 = space();
    			div135 = element("div");
    			div132 = element("div");
    			h527 = element("h5");
    			a68 = element("a");
    			t197 = space();
    			a69 = element("a");
    			p30 = element("p");
    			p30.textContent = "آرشیو کلیپ ها";
    			t199 = space();
    			div134 = element("div");
    			div133 = element("div");
    			h528 = element("h5");
    			i40 = element("i");
    			t200 = space();
    			a70 = element("a");
    			p31 = element("p");
    			p31.textContent = "راهیان نور";
    			t202 = space();
    			div139 = element("div");
    			t203 = space();
    			div163 = element("div");
    			div162 = element("div");
    			div158 = element("div");
    			div157 = element("div");
    			h529 = element("h5");
    			h529.textContent = "درباره آفرینه";
    			t205 = space();
    			p32 = element("p");
    			p32.textContent = "لورم ایپسوم یک متن ساختگی برای طراحی و نمایش محتوای بی ربط است اما این متن نوشته شده هیچ ربطی به لورم ایپسوم ندارد.\n                                    این چیزی که میبینید صرفا یک متن ساختگی تر نسبت به لورم ایپسوم است تا شما بتواندی با گرفتن خروجی در سایت و موبایل یا هر دستگاه دیگر خروجی بگیرید و نگاه کنید که ساختار کد نوشتاری سایت با لورم به چه صورتی در آمده است.\n                                    با تشکر از سایت ساختگی نوشتار لورم ایپسوم آقای بوق";
    			t207 = space();
    			div156 = element("div");
    			div155 = element("div");
    			div143 = element("div");
    			div143.textContent = "وبسایت";
    			t209 = space();
    			div144 = element("div");
    			a71 = element("a");
    			a71.textContent = "http://afarine.com/";
    			t211 = space();
    			div145 = element("div");
    			div145.textContent = "نوع فعالیت";
    			t213 = space();
    			div146 = element("div");
    			div146.textContent = "کارآفرینی و کسب و کار - خصوصی";
    			t215 = space();
    			div147 = element("div");
    			div147.textContent = "میزان استخدام";
    			t217 = space();
    			div148 = element("div");
    			div148.textContent = "۱۲۰ + کارمند";
    			t219 = space();
    			div149 = element("div");
    			div149.textContent = "تاریخ تاسیس";
    			t221 = space();
    			div150 = element("div");
    			div150.textContent = "۲۰۱۸";
    			t223 = space();
    			div151 = element("div");
    			div151.textContent = "تخصص ها";
    			t225 = space();
    			div152 = element("div");
    			div152.textContent = "اشتغال/بازاریابی/کسب و کار/";
    			t227 = space();
    			div153 = element("div");
    			div153.textContent = "آدرس اصلی";
    			t229 = space();
    			div154 = element("div");
    			div154.textContent = "تهران,شهرک طالقانی,ساحتمان نگین";
    			t231 = space();
    			div161 = element("div");
    			div160 = element("div");
    			h530 = element("h5");
    			h530.textContent = "موقعیت مکانی آفرینه";
    			t233 = space();
    			p33 = element("p");
    			p33.textContent = "برای یافتن مکان دقیق باید زوم کنید";
    			t235 = space();
    			div159 = element("div");
    			t236 = space();
    			br0 = element("br");
    			br1 = element("br");
    			attr_dev(img0, "class", "h-auto w-100 dream-job-image ");
    			if (img0.src !== (img0_src_value = "image/job.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$7, 131, 32, 5382);
    			attr_dev(a0, "href", "#");
    			add_location(a0, file$7, 130, 27, 5337);
    			attr_dev(div0, "class", "col-12 px-0");
    			add_location(div0, file$7, 129, 24, 5284);
    			attr_dev(div1, "class", "row w-100 mx-0");
    			add_location(div1, file$7, 128, 20, 5231);
    			attr_dev(div2, "class", "col-12 shadow-radius-section bg-light px-0 py-0");
    			add_location(div2, file$7, 127, 16, 5149);
    			attr_dev(div3, "class", "row mx-0 w-100");
    			add_location(div3, file$7, 126, 12, 5104);
    			attr_dev(aside0, "class", "col-12 col-md-3 mr-1 d-none d-lg-inline px-0");
    			add_location(aside0, file$7, 125, 8, 5030);
    			attr_dev(img1, "class", " header-image bg-light");
    			if (img1.src !== (img1_src_value = "image/head.jpeg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$7, 143, 28, 5906);
    			attr_dev(div4, "class", "col-12 p-0 banner");
    			set_style(div4, "overflow", "hidden");
    			add_location(div4, file$7, 142, 24, 5820);
    			attr_dev(img2, "class", "header-logo-image");
    			if (img2.src !== (img2_src_value = "image/afarine.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$7, 146, 28, 6094);
    			attr_dev(div5, "class", "col-12 header-image-main");
    			add_location(div5, file$7, 145, 24, 6027);
    			set_style(i0, "color", "#048af7");
    			set_style(i0, "font-size", "20px");
    			attr_dev(i0, "class", "fas fa-check-circle");
    			add_location(i0, file$7, 151, 94, 6440);
    			attr_dev(h4, "class", "font-weight-normal text-font-size");
    			add_location(h4, file$7, 151, 36, 6382);
    			attr_dev(i1, "class", "fas fa-map-marker-alt");
    			add_location(i1, file$7, 152, 63, 6583);
    			attr_dev(h60, "class", "text-secondary");
    			add_location(h60, file$7, 152, 36, 6556);
    			attr_dev(h61, "class", "explain-about-page");
    			add_location(h61, file$7, 153, 36, 6703);
    			attr_dev(i2, "class", "fas fa-external-link-alt padding-button ml-2 icon-size");
    			add_location(i2, file$7, 156, 129, 7167);
    			attr_dev(button0, "class", "btn rounded-pill mb-1 font btn-mw text-center visit-btn mx-0 mx-sm-1");
    			add_location(button0, file$7, 156, 44, 7082);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "data-toggle", "dropdown");
    			attr_dev(button1, "class", "pt-custome-more-btn btn btn-mw rounded-pill col-12 font text-center col-md-6 mr-2");
    			add_location(button1, file$7, 158, 48, 7447);
    			attr_dev(i3, "class", "fas fa-share-alt");
    			add_location(i3, file$7, 160, 68, 7755);
    			attr_dev(a1, "href", "#");
    			add_location(a1, file$7, 160, 56, 7743);
    			add_location(li0, file$7, 160, 52, 7739);
    			attr_dev(i4, "class", "fas fa-flag");
    			add_location(i4, file$7, 161, 68, 7878);
    			attr_dev(a2, "href", "#");
    			add_location(a2, file$7, 161, 56, 7866);
    			add_location(li1, file$7, 161, 52, 7862);
    			attr_dev(ul0, "class", "dropdown-menu  ellipsis-menu");
    			add_location(ul0, file$7, 159, 48, 7645);
    			attr_dev(div6, "class", div6_class_value = "" + ((/*x*/ ctx[1] <= 320 ? "col-12" : "col-5") + " col-md-3 justify-content-start navbar dropleft pr-1"));
    			add_location(div6, file$7, 157, 44, 7303);
    			attr_dev(div7, "class", "row vm-navbar");
    			add_location(div7, file$7, 155, 40, 7010);
    			attr_dev(div8, "class", "col-12 mt-4 font");
    			add_location(div8, file$7, 154, 36, 6939);
    			attr_dev(div9, "class", "col-10");
    			add_location(div9, file$7, 150, 32, 6325);
    			attr_dev(div10, "class", "row");
    			add_location(div10, file$7, 149, 28, 6275);
    			attr_dev(div11, "class", "header-detail col-12");
    			add_location(div11, file$7, 148, 24, 6212);
    			attr_dev(a3, "class", "py-2 nav-link-scroll");
    			attr_dev(a3, "data-toggle", "tab");
    			attr_dev(a3, "href", "#about");
    			toggle_class(a3, "active", /*current*/ ctx[4] === "about");
    			add_location(a3, file$7, 174, 73, 8609);
    			attr_dev(li2, "class", "nav-item-scroll mt-2");
    			add_location(li2, file$7, 174, 40, 8576);
    			attr_dev(a4, "class", "py-2 nav-link-scroll");
    			attr_dev(a4, "data-toggle", "tab");
    			attr_dev(a4, "href", "#post");
    			toggle_class(a4, "active", /*current*/ ctx[4] === "post");
    			add_location(a4, file$7, 175, 73, 8834);
    			attr_dev(li3, "class", "nav-item-scroll mt-2");
    			add_location(li3, file$7, 175, 40, 8801);
    			attr_dev(ul1, "class", "nav nav-tabs direction text-center");
    			attr_dev(ul1, "role", "tablist");
    			add_location(ul1, file$7, 173, 36, 8473);
    			attr_dev(div12, "class", "row  scroll-main-height");
    			add_location(div12, file$7, 172, 32, 8399);
    			attr_dev(div13, "class", "col-12 tab-header-main mt-3 ");
    			add_location(div13, file$7, 171, 28, 8324);
    			attr_dev(div14, "class", "row p-0 shadow-radius-section bg-white");
    			add_location(div14, file$7, 141, 20, 5742);
    			attr_dev(div15, "class", "col-12 ");
    			add_location(div15, file$7, 140, 16, 5700);
    			attr_dev(div16, "class", "row ml-lg-0 ");
    			add_location(div16, file$7, 139, 12, 5657);
    			attr_dev(img3, "class", "cu-image-com mr-1 ");
    			if (img3.src !== (img3_src_value = "image/afarine.jpg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "");
    			add_location(img3, file$7, 196, 60, 10255);
    			attr_dev(div17, "class", "col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width");
    			add_location(div17, file$7, 195, 56, 10125);
    			set_style(i5, "color", "#048af7");
    			attr_dev(i5, "class", "fas fa-check-circle");
    			add_location(i5, file$7, 200, 141, 10790);
    			attr_dev(a5, "href", "magezine");
    			attr_dev(a5, "class", "title-post-link");
    			add_location(a5, file$7, 200, 68, 10717);
    			add_location(h62, file$7, 200, 64, 10713);
    			attr_dev(i6, "class", "fas fa-clock");
    			add_location(i6, file$7, 201, 96, 10954);
    			attr_dev(span0, "class", "show-time-custome");
    			add_location(span0, file$7, 201, 64, 10922);
    			attr_dev(div18, "class", "cu-intro mt-2");
    			add_location(div18, file$7, 199, 60, 10621);
    			attr_dev(div19, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-0 pr-md-4 mr-lg-2 mr-xl-0 pr-xl-3 justify-content-center custome-margin-right ");
    			add_location(div19, file$7, 198, 56, 10438);
    			attr_dev(div20, "class", "row ");
    			add_location(div20, file$7, 194, 52, 10050);
    			attr_dev(div21, "class", "col-11 col-md-11");
    			add_location(div21, file$7, 193, 48, 9966);
    			attr_dev(i7, "class", "fas fa-ellipsis-h -1 ");
    			attr_dev(i7, "type", "button");
    			attr_dev(i7, "data-toggle", "dropdown");
    			add_location(i7, file$7, 208, 52, 11477);
    			attr_dev(i8, "class", "far fa-bookmark");
    			add_location(i8, file$7, 210, 136, 11781);
    			attr_dev(a6, "class", "dropdown-item");
    			attr_dev(a6, "href", "#");
    			add_location(a6, file$7, 210, 101, 11746);
    			add_location(li4, file$7, 210, 56, 11701);
    			attr_dev(i9, "class", "fas fa-share-alt");
    			add_location(i9, file$7, 211, 94, 11932);
    			attr_dev(a7, "class", "dropdown-item");
    			attr_dev(a7, "href", "#");
    			add_location(a7, file$7, 211, 60, 11898);
    			add_location(li5, file$7, 211, 56, 11894);
    			attr_dev(i10, "class", "fas fa-flag");
    			add_location(i10, file$7, 212, 94, 12083);
    			attr_dev(a8, "class", "dropdown-item");
    			attr_dev(a8, "href", "#");
    			add_location(a8, file$7, 212, 60, 12049);
    			add_location(li6, file$7, 212, 56, 12045);
    			attr_dev(ul2, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul2, file$7, 209, 52, 11604);
    			attr_dev(div22, "class", "report col-1 ml-0 pl-0 pr-3 navbar pr-sm-4 pr-md-3 pr-lg-3 pr-xl-4 ");
    			add_location(div22, file$7, 207, 48, 11343);
    			attr_dev(div23, "class", "row justify-content-between p-2 pl-4 pl-md-2");
    			add_location(div23, file$7, 192, 44, 9859);
    			attr_dev(div24, "class", "col-12");
    			add_location(div24, file$7, 191, 40, 9794);
    			attr_dev(a9, "class", "title-post-link");
    			attr_dev(a9, "href", "magezine/show-detail");
    			add_location(a9, file$7, 219, 88, 12536);
    			attr_dev(h30, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h30, file$7, 219, 44, 12492);
    			attr_dev(div25, "class", "col-12 p-0");
    			add_location(div25, file$7, 218, 40, 12423);
    			if (img4.src !== (img4_src_value = "image/30.jpg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img4, "alt", "");
    			add_location(img4, file$7, 222, 44, 12812);
    			attr_dev(div26, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div26, file$7, 221, 40, 12710);
    			attr_dev(span1, "class", "content d-inline");
    			add_location(span1, file$7, 226, 44, 13111);
    			attr_dev(span2, "class", "read-more-custom");
    			attr_dev(span2, "onclick", "readMore(this)");
    			set_style(span2, "cursor", "pointer");
    			add_location(span2, file$7, 238, 44, 16671);
    			attr_dev(button2, "class", "btn btn-sm btn-danger col-12 my-1 p-1 offset-0 font-family");
    			add_location(button2, file$7, 242, 56, 17113);
    			attr_dev(a10, "href", "magezine/show-detail");
    			attr_dev(a10, "class", "col-3 col-md-2 px-0");
    			add_location(a10, file$7, 241, 52, 16997);
    			attr_dev(div27, "class", "row pl-0 ml-0 pt-2 justify-content-end ");
    			add_location(div27, file$7, 240, 48, 16891);
    			attr_dev(span3, "class", "read-more ");
    			add_location(span3, file$7, 239, 44, 16817);
    			attr_dev(p0, "class", "post-text col-12 mt-3 post-text");
    			add_location(p0, file$7, 225, 40, 13023);
    			attr_dev(img5, "class", "personal-img");
    			if (img5.src !== (img5_src_value = "image/1.jpeg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "");
    			add_location(img5, file$7, 252, 48, 17732);
    			attr_dev(span4, "class", "personal-name");
    			add_location(span4, file$7, 253, 48, 17833);
    			attr_dev(a11, "class", "a-clicked");
    			attr_dev(a11, "href", "profile");
    			add_location(a11, file$7, 251, 44, 17647);
    			attr_dev(i11, "class", "fas fa-eye");
    			add_location(i11, file$7, 255, 68, 18016);
    			attr_dev(div28, "class", "view-count");
    			add_location(div28, file$7, 255, 44, 17992);
    			attr_dev(div29, "class", "col-12 mb-1 author-show-box pt-1");
    			add_location(div29, file$7, 250, 40, 17556);
    			attr_dev(article0, "class", "p-0  shadow-radius-section shadow-section mb-4 bg-light");
    			add_location(article0, file$7, 190, 36, 9680);
    			attr_dev(img6, "class", "cu-image-com mr-1 ");
    			if (img6.src !== (img6_src_value = "image/afarine.jpg")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "alt", "");
    			add_location(img6, file$7, 264, 60, 18757);
    			attr_dev(div30, "class", "col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width");
    			add_location(div30, file$7, 263, 56, 18627);
    			set_style(i12, "color", "#048af7");
    			attr_dev(i12, "class", "fas fa-check-circle");
    			add_location(i12, file$7, 268, 141, 19292);
    			attr_dev(a12, "href", "magezine");
    			attr_dev(a12, "class", "title-post-link");
    			add_location(a12, file$7, 268, 68, 19219);
    			add_location(h63, file$7, 268, 64, 19215);
    			attr_dev(i13, "class", "fas fa-clock");
    			add_location(i13, file$7, 269, 96, 19456);
    			attr_dev(span5, "class", "show-time-custome");
    			add_location(span5, file$7, 269, 64, 19424);
    			attr_dev(div31, "class", "cu-intro mt-2");
    			add_location(div31, file$7, 267, 60, 19123);
    			attr_dev(div32, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-0 pr-md-4 mr-lg-2 mr-xl-0 pr-xl-3 justify-content-center custome-margin-right ");
    			add_location(div32, file$7, 266, 56, 18940);
    			attr_dev(div33, "class", "row ");
    			add_location(div33, file$7, 262, 52, 18552);
    			attr_dev(div34, "class", "col-11 col-md-11");
    			add_location(div34, file$7, 261, 48, 18468);
    			attr_dev(i14, "class", "fas fa-ellipsis-h -1 ");
    			attr_dev(i14, "type", "button");
    			attr_dev(i14, "data-toggle", "dropdown");
    			add_location(i14, file$7, 276, 52, 19979);
    			attr_dev(i15, "class", "far fa-bookmark");
    			add_location(i15, file$7, 278, 136, 20283);
    			attr_dev(a13, "class", "dropdown-item");
    			attr_dev(a13, "href", "#");
    			add_location(a13, file$7, 278, 101, 20248);
    			add_location(li7, file$7, 278, 56, 20203);
    			attr_dev(i16, "class", "fas fa-share-alt");
    			add_location(i16, file$7, 279, 94, 20434);
    			attr_dev(a14, "class", "dropdown-item");
    			attr_dev(a14, "href", "#");
    			add_location(a14, file$7, 279, 60, 20400);
    			add_location(li8, file$7, 279, 56, 20396);
    			attr_dev(i17, "class", "fas fa-flag");
    			add_location(i17, file$7, 280, 94, 20585);
    			attr_dev(a15, "class", "dropdown-item");
    			attr_dev(a15, "href", "#");
    			add_location(a15, file$7, 280, 60, 20551);
    			add_location(li9, file$7, 280, 56, 20547);
    			attr_dev(ul3, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul3, file$7, 277, 52, 20106);
    			attr_dev(div35, "class", "report col-1 ml-0 pl-0 pr-3 navbar pr-sm-4 pr-md-3 pr-lg-3 pr-xl-4 ");
    			add_location(div35, file$7, 275, 48, 19845);
    			attr_dev(div36, "class", "row justify-content-between p-2 pl-4 pl-md-2");
    			add_location(div36, file$7, 260, 44, 18361);
    			attr_dev(div37, "class", "col-12");
    			add_location(div37, file$7, 259, 40, 18296);
    			attr_dev(a16, "class", "title-post-link");
    			attr_dev(a16, "href", "magezine/show-detail");
    			add_location(a16, file$7, 287, 88, 21038);
    			attr_dev(h31, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h31, file$7, 287, 44, 20994);
    			attr_dev(div38, "class", "col-12 p-0");
    			add_location(div38, file$7, 286, 40, 20925);
    			if (img7.src !== (img7_src_value = "image/30.jpg")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img7, "alt", "");
    			add_location(img7, file$7, 290, 44, 21314);
    			attr_dev(div39, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div39, file$7, 289, 40, 21212);
    			attr_dev(span6, "class", "content d-inline");
    			add_location(span6, file$7, 294, 44, 21613);
    			attr_dev(span7, "class", "read-more-custom");
    			attr_dev(span7, "onclick", "readMore(this)");
    			set_style(span7, "cursor", "pointer");
    			add_location(span7, file$7, 306, 44, 25173);
    			attr_dev(button3, "class", "btn btn-sm btn-danger col-12 my-1 p-1 offset-0 font-family");
    			add_location(button3, file$7, 310, 56, 25615);
    			attr_dev(a17, "href", "magezine/show-detail");
    			attr_dev(a17, "class", "col-3 col-md-2 px-0");
    			add_location(a17, file$7, 309, 52, 25499);
    			attr_dev(div40, "class", "row pl-0 ml-0 pt-2 justify-content-end ");
    			add_location(div40, file$7, 308, 48, 25393);
    			attr_dev(span8, "class", "read-more ");
    			add_location(span8, file$7, 307, 44, 25319);
    			attr_dev(p1, "class", "post-text col-12 mt-3 post-text");
    			add_location(p1, file$7, 293, 40, 21525);
    			attr_dev(img8, "class", "personal-img");
    			if (img8.src !== (img8_src_value = "image/1.jpeg")) attr_dev(img8, "src", img8_src_value);
    			attr_dev(img8, "alt", "");
    			add_location(img8, file$7, 320, 48, 26234);
    			attr_dev(span9, "class", "personal-name");
    			add_location(span9, file$7, 321, 48, 26335);
    			attr_dev(a18, "class", "a-clicked");
    			attr_dev(a18, "href", "profile");
    			add_location(a18, file$7, 319, 44, 26149);
    			attr_dev(i18, "class", "fas fa-eye");
    			add_location(i18, file$7, 323, 68, 26518);
    			attr_dev(div41, "class", "view-count");
    			add_location(div41, file$7, 323, 44, 26494);
    			attr_dev(div42, "class", "col-12 mb-1 author-show-box pt-1");
    			add_location(div42, file$7, 318, 40, 26058);
    			attr_dev(article1, "class", "p-0  shadow-radius-section shadow-section mb-4 bg-light");
    			add_location(article1, file$7, 258, 36, 18182);
    			attr_dev(img9, "class", "cu-image-com mr-1 ");
    			if (img9.src !== (img9_src_value = "image/afarine.jpg")) attr_dev(img9, "src", img9_src_value);
    			attr_dev(img9, "alt", "");
    			add_location(img9, file$7, 332, 60, 27259);
    			attr_dev(div43, "class", "col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width");
    			add_location(div43, file$7, 331, 56, 27129);
    			set_style(i19, "color", "#048af7");
    			attr_dev(i19, "class", "fas fa-check-circle");
    			add_location(i19, file$7, 336, 141, 27794);
    			attr_dev(a19, "href", "magezine");
    			attr_dev(a19, "class", "title-post-link");
    			add_location(a19, file$7, 336, 68, 27721);
    			add_location(h64, file$7, 336, 64, 27717);
    			attr_dev(i20, "class", "fas fa-clock");
    			add_location(i20, file$7, 337, 96, 27958);
    			attr_dev(span10, "class", "show-time-custome");
    			add_location(span10, file$7, 337, 64, 27926);
    			attr_dev(div44, "class", "cu-intro mt-2");
    			add_location(div44, file$7, 335, 60, 27625);
    			attr_dev(div45, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-0 pr-md-4 mr-lg-2 mr-xl-0 pr-xl-3 justify-content-center custome-margin-right ");
    			add_location(div45, file$7, 334, 56, 27442);
    			attr_dev(div46, "class", "row ");
    			add_location(div46, file$7, 330, 52, 27054);
    			attr_dev(div47, "class", "col-11 col-md-11");
    			add_location(div47, file$7, 329, 48, 26970);
    			attr_dev(i21, "class", "fas fa-ellipsis-h -1 ");
    			attr_dev(i21, "type", "button");
    			attr_dev(i21, "data-toggle", "dropdown");
    			add_location(i21, file$7, 344, 52, 28481);
    			attr_dev(i22, "class", "far fa-bookmark");
    			add_location(i22, file$7, 346, 136, 28785);
    			attr_dev(a20, "class", "dropdown-item");
    			attr_dev(a20, "href", "#");
    			add_location(a20, file$7, 346, 101, 28750);
    			add_location(li10, file$7, 346, 56, 28705);
    			attr_dev(i23, "class", "fas fa-share-alt");
    			add_location(i23, file$7, 347, 94, 28936);
    			attr_dev(a21, "class", "dropdown-item");
    			attr_dev(a21, "href", "#");
    			add_location(a21, file$7, 347, 60, 28902);
    			add_location(li11, file$7, 347, 56, 28898);
    			attr_dev(i24, "class", "fas fa-flag");
    			add_location(i24, file$7, 348, 94, 29087);
    			attr_dev(a22, "class", "dropdown-item");
    			attr_dev(a22, "href", "#");
    			add_location(a22, file$7, 348, 60, 29053);
    			add_location(li12, file$7, 348, 56, 29049);
    			attr_dev(ul4, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul4, file$7, 345, 52, 28608);
    			attr_dev(div48, "class", "report col-1 ml-0 pl-0 pr-3 navbar pr-sm-4 pr-md-3 pr-lg-3 pr-xl-4 ");
    			add_location(div48, file$7, 343, 48, 28347);
    			attr_dev(div49, "class", "row justify-content-between p-2 pl-4 pl-md-2");
    			add_location(div49, file$7, 328, 44, 26863);
    			attr_dev(div50, "class", "col-12");
    			add_location(div50, file$7, 327, 40, 26798);
    			attr_dev(a23, "class", "title-post-link");
    			attr_dev(a23, "href", "magezine/show-detail");
    			add_location(a23, file$7, 355, 88, 29540);
    			attr_dev(h32, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h32, file$7, 355, 44, 29496);
    			attr_dev(div51, "class", "col-12 p-0");
    			add_location(div51, file$7, 354, 40, 29427);
    			if (img10.src !== (img10_src_value = "image/30.jpg")) attr_dev(img10, "src", img10_src_value);
    			attr_dev(img10, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img10, "alt", "");
    			add_location(img10, file$7, 358, 44, 29816);
    			attr_dev(div52, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div52, file$7, 357, 40, 29714);
    			attr_dev(span11, "class", "content d-inline");
    			add_location(span11, file$7, 362, 44, 30115);
    			attr_dev(span12, "class", "read-more-custom");
    			attr_dev(span12, "onclick", "readMore(this)");
    			set_style(span12, "cursor", "pointer");
    			add_location(span12, file$7, 374, 44, 33675);
    			attr_dev(button4, "class", "btn btn-sm btn-danger col-12 my-1 p-1 offset-0 font-family");
    			add_location(button4, file$7, 378, 56, 34117);
    			attr_dev(a24, "href", "magezine/show-detail");
    			attr_dev(a24, "class", "col-3 col-md-2 px-0");
    			add_location(a24, file$7, 377, 52, 34001);
    			attr_dev(div53, "class", "row pl-0 ml-0 pt-2 justify-content-end ");
    			add_location(div53, file$7, 376, 48, 33895);
    			attr_dev(span13, "class", "read-more ");
    			add_location(span13, file$7, 375, 44, 33821);
    			attr_dev(p2, "class", "post-text col-12 mt-3 post-text");
    			add_location(p2, file$7, 361, 40, 30027);
    			attr_dev(img11, "class", "personal-img");
    			if (img11.src !== (img11_src_value = "image/1.jpeg")) attr_dev(img11, "src", img11_src_value);
    			attr_dev(img11, "alt", "");
    			add_location(img11, file$7, 388, 48, 34736);
    			attr_dev(span14, "class", "personal-name");
    			add_location(span14, file$7, 389, 48, 34837);
    			attr_dev(a25, "class", "a-clicked");
    			attr_dev(a25, "href", "profile");
    			add_location(a25, file$7, 387, 44, 34651);
    			attr_dev(i25, "class", "fas fa-eye");
    			add_location(i25, file$7, 391, 68, 35020);
    			attr_dev(div54, "class", "view-count");
    			add_location(div54, file$7, 391, 44, 34996);
    			attr_dev(div55, "class", "col-12 mb-1 author-show-box pt-1");
    			add_location(div55, file$7, 386, 40, 34560);
    			attr_dev(article2, "class", "p-0  shadow-radius-section shadow-section mb-4 bg-light");
    			add_location(article2, file$7, 326, 36, 26684);
    			attr_dev(div56, "class", "col-12 p-0 main-article ");
    			add_location(div56, file$7, 189, 32, 9605);
    			attr_dev(section, "class", "row mx-0 mt-3 mr-0 pt-0  ");
    			add_location(section, file$7, 188, 28, 9529);
    			attr_dev(aside1, "class", "col-12 col-md-9 order-first justify-content-between order-md-0 mx-0 ");
    			add_location(aside1, file$7, 187, 24, 9416);
    			attr_dev(img12, "class", "company-img  w-100");
    			if (img12.src !== (img12_src_value = "image/afarine.jpg")) attr_dev(img12, "src", img12_src_value);
    			attr_dev(img12, "alt", "");
    			add_location(img12, file$7, 400, 36, 35547);
    			attr_dev(div57, "class", "col-10 mx-auto mt-3 mb-3 ");
    			add_location(div57, file$7, 399, 32, 35471);
    			attr_dev(h33, "class", "col-12");
    			add_location(h33, file$7, 402, 32, 35682);
    			attr_dev(h65, "class", "col-12 slogan");
    			add_location(h65, file$7, 405, 32, 35815);
    			attr_dev(div58, "class", "row px-0 text-center shadow-radius-section bg-light ");
    			toggle_class(div58, "d-none", /*x*/ ctx[1] <= 767);
    			add_location(div58, file$7, 398, 28, 35350);

    			attr_dev(i26, "class", i26_class_value = "" + ((/*x*/ ctx[1] >= 767
    			? "fas fa-list-ul category-icon-modal"
    			: "fas fa-caret-left") + " "));

    			toggle_class(i26, "category-fixed-icon-modal", /*x*/ ctx[1] <= 767 && /*y*/ ctx[0] >= 400);
    			add_location(i26, file$7, 415, 40, 36690);
    			attr_dev(a26, "type", a26_type_value = /*x*/ ctx[1] <= 767 ? "button" : "");
    			attr_dev(a26, "class", "btn ");
    			attr_dev(a26, "data-toggle", a26_data_toggle_value = /*x*/ ctx[1] <= 767 ? "modal" : "");
    			attr_dev(a26, "data-target", a26_data_target_value = /*x*/ ctx[1] <= 767 ? "#mod2" : "");
    			add_location(a26, file$7, 414, 36, 36524);
    			attr_dev(span15, "class", "d-none d-md-inline");
    			add_location(span15, file$7, 416, 40, 36870);

    			attr_dev(div59, "class", div59_class_value = /*x*/ ctx[1] >= 767
    			? "col-12 font-weight-bold pb-2 border-bottom pr-0"
    			: "col-12 font-weight-bold");

    			add_location(div59, file$7, 412, 32, 36303);
    			attr_dev(i27, "class", "fas fa-dot-circle p-0 d-inline category_button-non");
    			add_location(i27, file$7, 432, 50, 38178);
    			attr_dev(p3, "class", "category-main-text d-inline");
    			add_location(p3, file$7, 434, 52, 38393);
    			attr_dev(a27, "href", "#");
    			attr_dev(a27, "class", "category-main-text-link");
    			add_location(a27, file$7, 433, 50, 38296);
    			attr_dev(h50, "class", "mb-0");
    			add_location(h50, file$7, 431, 48, 38110);
    			attr_dev(div60, "class", "border-bottom pb-2");
    			attr_dev(div60, "id", "");
    			add_location(div60, file$7, 430, 44, 38023);
    			attr_dev(a28, "class", "p-0 d-inline  category_button collapsed ");
    			attr_dev(a28, "data-toggle", "collapse");
    			attr_dev(a28, "data-target", "#collapseOne");
    			attr_dev(a28, "aria-expanded", "true");
    			attr_dev(a28, "aria-controls", "collapseOne");
    			add_location(a28, file$7, 440, 46, 38801);
    			attr_dev(p4, "class", "category-main-text d-inline");
    			add_location(p4, file$7, 442, 48, 39096);
    			attr_dev(a29, "href", "#");
    			attr_dev(a29, "class", "category-main-text-link");
    			add_location(a29, file$7, 441, 46, 39003);
    			attr_dev(h51, "class", "mb-0 mt-2");
    			add_location(h51, file$7, 439, 44, 38732);
    			attr_dev(div61, "class", "border-bottom pb-2");
    			attr_dev(div61, "id", "headingOne");
    			add_location(div61, file$7, 438, 40, 38639);
    			attr_dev(a30, "class", "p-0 d-inline category_button collapsed ");
    			attr_dev(a30, "data-toggle", "collapse");
    			attr_dev(a30, "data-target", "#collapseOneOne");
    			attr_dev(a30, "aria-expanded", "true");
    			attr_dev(a30, "aria-controls", "collapseOneOne");
    			add_location(a30, file$7, 453, 62, 40001);
    			attr_dev(p5, "class", "category-main-text d-inline");
    			add_location(p5, file$7, 455, 64, 40333);
    			attr_dev(a31, "href", "#");
    			attr_dev(a31, "class", "category-main-text-link");
    			add_location(a31, file$7, 454, 62, 40224);
    			attr_dev(h52, "class", "mb-0");
    			add_location(h52, file$7, 452, 60, 39921);
    			attr_dev(div62, "class", "border-bottom pb-2");
    			attr_dev(div62, "id", "headingOneOne");
    			add_location(div62, file$7, 451, 58, 39809);
    			attr_dev(i28, "class", "fas fa-dot-circle p-0 d-inline category_button-non");
    			add_location(i28, file$7, 463, 70, 41093);
    			attr_dev(p6, "class", "category-main-text d-inline");
    			add_location(p6, file$7, 465, 72, 41348);
    			attr_dev(a32, "href", "#");
    			attr_dev(a32, "class", "category-main-text-link");
    			add_location(a32, file$7, 464, 70, 41231);
    			attr_dev(h53, "class", "mb-0");
    			add_location(h53, file$7, 462, 68, 41005);
    			attr_dev(div63, "class", "border-bottom pb-2");
    			attr_dev(div63, "id", "");
    			add_location(div63, file$7, 461, 64, 40898);
    			attr_dev(div64, "class", "my-1 pl-2 ");
    			add_location(div64, file$7, 460, 60, 40809);
    			attr_dev(div65, "id", "collapseOneOne");
    			attr_dev(div65, "class", "collapse mr-3 ");
    			attr_dev(div65, "aria-labelledby", "headingOneOne");
    			attr_dev(div65, "data-parent", "#accordion1");
    			add_location(div65, file$7, 459, 58, 40642);
    			attr_dev(a33, "href", "#");
    			attr_dev(a33, "class", "p-0 d-inline category_button collapsed");
    			attr_dev(a33, "data-toggle", "collapse");
    			attr_dev(a33, "data-target", "#collapseTwoTwo");
    			attr_dev(a33, "aria-expanded", "false");
    			attr_dev(a33, "aria-controls", "collapseTwoTwo");
    			add_location(a33, file$7, 474, 62, 42075);
    			attr_dev(p7, "class", "category-main-text d-inline");
    			add_location(p7, file$7, 476, 64, 42416);
    			attr_dev(a34, "href", "#");
    			attr_dev(a34, "class", "category-main-text-link");
    			add_location(a34, file$7, 475, 62, 42307);
    			attr_dev(h54, "class", "mb-0");
    			add_location(h54, file$7, 473, 60, 41995);
    			attr_dev(div66, "class", "border-bottom pb-2");
    			attr_dev(div66, "id", "headingTwoTwo");
    			add_location(div66, file$7, 472, 58, 41883);
    			attr_dev(i29, "class", "fas fa-dot-circle p-0 d-inline category_button-non");
    			add_location(i29, file$7, 483, 66, 43084);
    			attr_dev(p8, "class", "category-main-text d-inline");
    			add_location(p8, file$7, 485, 68, 43331);
    			attr_dev(a35, "href", "#");
    			attr_dev(a35, "class", "category-main-text-link");
    			add_location(a35, file$7, 484, 66, 43218);
    			attr_dev(h55, "class", "mb-0");
    			add_location(h55, file$7, 482, 64, 43000);
    			attr_dev(div67, "class", "border-bottom py-2");
    			attr_dev(div67, "id", "");
    			add_location(div67, file$7, 481, 60, 42897);
    			attr_dev(div68, "id", "collapseTwoTwo");
    			attr_dev(div68, "class", "collapse mr-3");
    			attr_dev(div68, "aria-labelledby", "headingTwoTwo");
    			attr_dev(div68, "data-parent", "#accordion1");
    			add_location(div68, file$7, 480, 58, 42731);
    			attr_dev(div69, "class", "my-2 pl-2");
    			add_location(div69, file$7, 471, 56, 41801);
    			attr_dev(a36, "href", "#");
    			attr_dev(a36, "class", "p-0 d-inline category_button collapsed");
    			attr_dev(a36, "data-toggle", "collapse");
    			attr_dev(a36, "data-target", "#collapseThreeThree");
    			attr_dev(a36, "aria-expanded", "false");
    			attr_dev(a36, "aria-controls", "collapseThreeThree");
    			add_location(a36, file$7, 494, 62, 44055);
    			attr_dev(p9, "class", "category-main-text d-inline");
    			add_location(p9, file$7, 496, 64, 44404);
    			attr_dev(a37, "href", "#");
    			attr_dev(a37, "class", "category-main-text-link");
    			add_location(a37, file$7, 495, 62, 44295);
    			attr_dev(h56, "class", "mb-0");
    			add_location(h56, file$7, 493, 60, 43975);
    			attr_dev(div70, "class", "border-bottom pb-2");
    			attr_dev(div70, "id", "headingThreeThree");
    			add_location(div70, file$7, 492, 58, 43859);
    			attr_dev(a38, "class", "p-0 d-inline category_button collapsed ");
    			attr_dev(a38, "data-toggle", "collapse");
    			attr_dev(a38, "data-target", "#collapseOneOneOne");
    			attr_dev(a38, "aria-expanded", "true");
    			attr_dev(a38, "aria-controls", "collapseOneOneOne");
    			add_location(a38, file$7, 507, 78, 45506);
    			attr_dev(p10, "class", "category-main-text d-inline");
    			add_location(p10, file$7, 509, 80, 45876);
    			attr_dev(a39, "href", "#");
    			attr_dev(a39, "class", "category-main-text-link");
    			add_location(a39, file$7, 508, 78, 45751);
    			attr_dev(h57, "class", "mb-0");
    			add_location(h57, file$7, 506, 76, 45410);
    			attr_dev(div71, "class", "border-bottom pb-2");
    			attr_dev(div71, "id", "headingOneOneOne");
    			add_location(div71, file$7, 505, 74, 45279);
    			attr_dev(i30, "class", "fas fa-dot-circle p-0 d-inline category_button-non");
    			add_location(i30, file$7, 516, 82, 46657);
    			attr_dev(p11, "class", "category-main-text d-inline");
    			add_location(p11, file$7, 518, 84, 46936);
    			attr_dev(a40, "href", "#");
    			attr_dev(a40, "class", "category-main-text-link");
    			add_location(a40, file$7, 517, 82, 46807);
    			attr_dev(h58, "class", "mb-0");
    			add_location(h58, file$7, 515, 80, 46557);
    			attr_dev(div72, "class", "border-bottom py-2");
    			attr_dev(div72, "id", "");
    			add_location(div72, file$7, 514, 76, 46438);
    			attr_dev(div73, "id", "collapseOneOneOne");
    			attr_dev(div73, "class", "collapse mr-3 ");
    			attr_dev(div73, "aria-labelledby", "headingOneOneOne");
    			attr_dev(div73, "data-parent", "#accordion2");
    			add_location(div73, file$7, 513, 74, 46249);
    			attr_dev(div74, "class", "mb-2 pl-2");
    			add_location(div74, file$7, 504, 72, 45181);
    			attr_dev(i31, "class", "fas fa-dot-circle p-0 d-inline category_button-non");
    			add_location(i31, file$7, 526, 78, 47686);
    			attr_dev(p12, "class", "category-main-text d-inline");
    			add_location(p12, file$7, 528, 80, 47957);
    			attr_dev(a41, "href", "#");
    			attr_dev(a41, "class", "category-main-text-link");
    			add_location(a41, file$7, 527, 78, 47832);
    			attr_dev(h59, "class", "mb-0");
    			add_location(h59, file$7, 525, 76, 47590);
    			attr_dev(div75, "class", "border-bottom pb-2");
    			attr_dev(div75, "id", "");
    			add_location(div75, file$7, 524, 72, 47475);
    			attr_dev(div76, "class", "");
    			add_location(div76, file$7, 533, 76, 48517);
    			attr_dev(div77, "id", "collapseTwoTwoTwo");
    			attr_dev(div77, "class", "collapse mr-3");
    			attr_dev(div77, "aria-labelledby", "headingTwoTwoTwo");
    			attr_dev(div77, "data-parent", "#accordion2");
    			add_location(div77, file$7, 532, 74, 48329);
    			attr_dev(div78, "id", "accordion2");
    			add_location(div78, file$7, 503, 68, 45087);
    			attr_dev(div79, "class", " mt-2 mr-1 col-12 p-0 ");
    			add_location(div79, file$7, 502, 64, 44982);
    			attr_dev(div80, "class", "border-right");
    			add_location(div80, file$7, 501, 60, 44891);
    			attr_dev(div81, "id", "collapseThreeThree");
    			attr_dev(div81, "class", "collapse mr-3");
    			attr_dev(div81, "aria-labelledby", "headingThreeThree");
    			attr_dev(div81, "data-parent", "#accordion1");
    			add_location(div81, file$7, 500, 58, 44717);
    			attr_dev(div82, "class", "mb-2 pl-2");
    			add_location(div82, file$7, 491, 56, 43777);
    			attr_dev(div83, "class", "mb-2 pl-2");
    			add_location(div83, file$7, 450, 56, 39727);
    			attr_dev(div84, "id", "accordion1");
    			add_location(div84, file$7, 449, 52, 39649);
    			attr_dev(div85, "class", " mt-2 mr-1 col-12 p-0 ");
    			add_location(div85, file$7, 448, 48, 39560);
    			attr_dev(div86, "class", "border-right");
    			add_location(div86, file$7, 447, 44, 39485);
    			attr_dev(div87, "id", "collapseOne");
    			attr_dev(div87, "class", "collapse mr-3 ");
    			attr_dev(div87, "aria-labelledby", "headingOne");
    			attr_dev(div87, "data-parent", "#accordion");
    			add_location(div87, file$7, 446, 42, 39341);
    			attr_dev(a42, "class", "p-0 d-inline  category_button collapsed ");
    			attr_dev(a42, "data-toggle", "collapse");
    			attr_dev(a42, "data-target", "#collapseOne");
    			attr_dev(a42, "aria-expanded", "true");
    			attr_dev(a42, "aria-controls", "collapseOne");
    			add_location(a42, file$7, 549, 46, 49628);
    			attr_dev(p13, "class", "category-main-text d-inline");
    			add_location(p13, file$7, 551, 48, 49923);
    			attr_dev(a43, "href", "#");
    			attr_dev(a43, "class", "category-main-text-link");
    			add_location(a43, file$7, 550, 46, 49830);
    			attr_dev(h510, "class", "mb-0 mt-2");
    			add_location(h510, file$7, 548, 44, 49559);
    			attr_dev(div88, "class", "border-bottom pb-2");
    			attr_dev(div88, "id", "headingOne");
    			add_location(div88, file$7, 547, 42, 49466);
    			attr_dev(a44, "class", "p-0 d-inline category_button collapsed ");
    			attr_dev(a44, "data-toggle", "collapse");
    			attr_dev(a44, "data-target", "#collapseOneOne");
    			attr_dev(a44, "aria-expanded", "true");
    			attr_dev(a44, "aria-controls", "collapseOneOne");
    			add_location(a44, file$7, 562, 62, 50828);
    			attr_dev(p14, "class", "category-main-text d-inline");
    			add_location(p14, file$7, 564, 64, 51160);
    			attr_dev(a45, "href", "#");
    			attr_dev(a45, "class", "category-main-text-link");
    			add_location(a45, file$7, 563, 62, 51051);
    			attr_dev(h511, "class", "mb-0");
    			add_location(h511, file$7, 561, 60, 50748);
    			attr_dev(div89, "class", "border-bottom pb-2");
    			attr_dev(div89, "id", "headingOneOne");
    			add_location(div89, file$7, 560, 58, 50636);
    			attr_dev(i32, "class", "fas fa-dot-circle p-0 d-inline category_button-non");
    			add_location(i32, file$7, 572, 70, 51920);
    			attr_dev(p15, "class", "category-main-text d-inline");
    			add_location(p15, file$7, 574, 72, 52175);
    			attr_dev(a46, "href", "#");
    			attr_dev(a46, "class", "category-main-text-link");
    			add_location(a46, file$7, 573, 70, 52058);
    			attr_dev(h512, "class", "mb-0");
    			add_location(h512, file$7, 571, 68, 51832);
    			attr_dev(div90, "class", "border-bottom pb-2");
    			attr_dev(div90, "id", "");
    			add_location(div90, file$7, 570, 64, 51725);
    			attr_dev(div91, "class", "my-1 pl-2 ");
    			add_location(div91, file$7, 569, 60, 51636);
    			attr_dev(div92, "id", "collapseOneOne");
    			attr_dev(div92, "class", "collapse mr-3 ");
    			attr_dev(div92, "aria-labelledby", "headingOneOne");
    			attr_dev(div92, "data-parent", "#accordion1");
    			add_location(div92, file$7, 568, 58, 51469);
    			attr_dev(a47, "href", "#");
    			attr_dev(a47, "class", "p-0 d-inline category_button collapsed");
    			attr_dev(a47, "data-toggle", "collapse");
    			attr_dev(a47, "data-target", "#collapseTwoTwo");
    			attr_dev(a47, "aria-expanded", "false");
    			attr_dev(a47, "aria-controls", "collapseTwoTwo");
    			add_location(a47, file$7, 583, 62, 52902);
    			attr_dev(p16, "class", "category-main-text d-inline");
    			add_location(p16, file$7, 585, 64, 53243);
    			attr_dev(a48, "href", "#");
    			attr_dev(a48, "class", "category-main-text-link");
    			add_location(a48, file$7, 584, 62, 53134);
    			attr_dev(h513, "class", "mb-0");
    			add_location(h513, file$7, 582, 60, 52822);
    			attr_dev(div93, "class", "border-bottom pb-2");
    			attr_dev(div93, "id", "headingTwoTwo");
    			add_location(div93, file$7, 581, 58, 52710);
    			attr_dev(i33, "class", "fas fa-dot-circle p-0 d-inline category_button-non");
    			add_location(i33, file$7, 592, 66, 53911);
    			attr_dev(p17, "class", "category-main-text d-inline");
    			add_location(p17, file$7, 594, 68, 54158);
    			attr_dev(a49, "href", "#");
    			attr_dev(a49, "class", "category-main-text-link");
    			add_location(a49, file$7, 593, 66, 54045);
    			attr_dev(h514, "class", "mb-0");
    			add_location(h514, file$7, 591, 64, 53827);
    			attr_dev(div94, "class", "border-bottom py-2");
    			attr_dev(div94, "id", "");
    			add_location(div94, file$7, 590, 60, 53724);
    			attr_dev(div95, "id", "collapseTwoTwo");
    			attr_dev(div95, "class", "collapse mr-3");
    			attr_dev(div95, "aria-labelledby", "headingTwoTwo");
    			attr_dev(div95, "data-parent", "#accordion1");
    			add_location(div95, file$7, 589, 58, 53558);
    			attr_dev(div96, "class", "my-2 pl-2");
    			add_location(div96, file$7, 580, 56, 52628);
    			attr_dev(a50, "href", "#");
    			attr_dev(a50, "class", "p-0 d-inline category_button collapsed");
    			attr_dev(a50, "data-toggle", "collapse");
    			attr_dev(a50, "data-target", "#collapseThreeThree");
    			attr_dev(a50, "aria-expanded", "false");
    			attr_dev(a50, "aria-controls", "collapseThreeThree");
    			add_location(a50, file$7, 603, 62, 54882);
    			attr_dev(p18, "class", "category-main-text d-inline");
    			add_location(p18, file$7, 605, 64, 55231);
    			attr_dev(a51, "href", "#");
    			attr_dev(a51, "class", "category-main-text-link");
    			add_location(a51, file$7, 604, 62, 55122);
    			attr_dev(h515, "class", "mb-0");
    			add_location(h515, file$7, 602, 60, 54802);
    			attr_dev(div97, "class", "border-bottom pb-2");
    			attr_dev(div97, "id", "headingThreeThree");
    			add_location(div97, file$7, 601, 58, 54686);
    			attr_dev(a52, "class", "p-0 d-inline category_button collapsed ");
    			attr_dev(a52, "data-toggle", "collapse");
    			attr_dev(a52, "data-target", "#collapseOneOneOne");
    			attr_dev(a52, "aria-expanded", "true");
    			attr_dev(a52, "aria-controls", "collapseOneOneOne");
    			add_location(a52, file$7, 616, 78, 56333);
    			attr_dev(p19, "class", "category-main-text d-inline");
    			add_location(p19, file$7, 618, 80, 56703);
    			attr_dev(a53, "href", "#");
    			attr_dev(a53, "class", "category-main-text-link");
    			add_location(a53, file$7, 617, 78, 56578);
    			attr_dev(h516, "class", "mb-0");
    			add_location(h516, file$7, 615, 76, 56237);
    			attr_dev(div98, "class", "border-bottom pb-2");
    			attr_dev(div98, "id", "headingOneOneOne");
    			add_location(div98, file$7, 614, 74, 56106);
    			attr_dev(i34, "class", "fas fa-dot-circle p-0 d-inline category_button-non");
    			add_location(i34, file$7, 625, 82, 57484);
    			attr_dev(p20, "class", "category-main-text d-inline");
    			add_location(p20, file$7, 627, 84, 57763);
    			attr_dev(a54, "href", "#");
    			attr_dev(a54, "class", "category-main-text-link");
    			add_location(a54, file$7, 626, 82, 57634);
    			attr_dev(h517, "class", "mb-0");
    			add_location(h517, file$7, 624, 80, 57384);
    			attr_dev(div99, "class", "border-bottom py-2");
    			attr_dev(div99, "id", "");
    			add_location(div99, file$7, 623, 76, 57265);
    			attr_dev(div100, "id", "collapseOneOneOne");
    			attr_dev(div100, "class", "collapse mr-3 ");
    			attr_dev(div100, "aria-labelledby", "headingOneOneOne");
    			attr_dev(div100, "data-parent", "#accordion2");
    			add_location(div100, file$7, 622, 74, 57076);
    			attr_dev(div101, "class", "mb-2 pl-2");
    			add_location(div101, file$7, 613, 72, 56008);
    			attr_dev(i35, "class", "fas fa-dot-circle p-0 d-inline category_button-non");
    			add_location(i35, file$7, 635, 78, 58513);
    			attr_dev(p21, "class", "category-main-text d-inline");
    			add_location(p21, file$7, 637, 80, 58784);
    			attr_dev(a55, "href", "#");
    			attr_dev(a55, "class", "category-main-text-link");
    			add_location(a55, file$7, 636, 78, 58659);
    			attr_dev(h518, "class", "mb-0");
    			add_location(h518, file$7, 634, 76, 58417);
    			attr_dev(div102, "class", "border-bottom pb-2");
    			attr_dev(div102, "id", "");
    			add_location(div102, file$7, 633, 72, 58302);
    			attr_dev(div103, "class", "");
    			add_location(div103, file$7, 642, 76, 59344);
    			attr_dev(div104, "id", "collapseTwoTwoTwo");
    			attr_dev(div104, "class", "collapse mr-3");
    			attr_dev(div104, "aria-labelledby", "headingTwoTwoTwo");
    			attr_dev(div104, "data-parent", "#accordion2");
    			add_location(div104, file$7, 641, 74, 59156);
    			attr_dev(div105, "id", "accordion2");
    			add_location(div105, file$7, 612, 68, 55914);
    			attr_dev(div106, "class", " mt-2 mr-1 col-12 p-0 ");
    			add_location(div106, file$7, 611, 64, 55809);
    			attr_dev(div107, "class", "border-right");
    			add_location(div107, file$7, 610, 60, 55718);
    			attr_dev(div108, "id", "collapseThreeThree");
    			attr_dev(div108, "class", "collapse mr-3");
    			attr_dev(div108, "aria-labelledby", "headingThreeThree");
    			attr_dev(div108, "data-parent", "#accordion1");
    			add_location(div108, file$7, 609, 58, 55544);
    			attr_dev(div109, "class", "mb-2 pl-2");
    			add_location(div109, file$7, 600, 56, 54604);
    			attr_dev(div110, "class", "mb-2 pl-2");
    			add_location(div110, file$7, 559, 56, 50554);
    			attr_dev(div111, "id", "accordion1");
    			add_location(div111, file$7, 558, 52, 50476);
    			attr_dev(div112, "class", " mt-2 mr-1 col-12 p-0 ");
    			add_location(div112, file$7, 557, 48, 50387);
    			attr_dev(div113, "class", "border-right");
    			add_location(div113, file$7, 556, 44, 50312);
    			attr_dev(div114, "id", "collapseOne");
    			attr_dev(div114, "class", "collapse mr-3 ");
    			attr_dev(div114, "aria-labelledby", "headingOne");
    			attr_dev(div114, "data-parent", "#accordion");
    			add_location(div114, file$7, 555, 42, 50168);
    			attr_dev(div115, "class", "mb-2 pl-2 ");
    			add_location(div115, file$7, 429, 40, 37954);
    			attr_dev(a56, "href", "#");
    			attr_dev(a56, "class", "p-0 d-inline category_button collapsed");
    			attr_dev(a56, "data-toggle", "collapse");
    			attr_dev(a56, "data-target", "#collapseTwo");
    			attr_dev(a56, "aria-expanded", "false");
    			attr_dev(a56, "aria-controls", "collapseTwo");
    			add_location(a56, file$7, 660, 46, 60561);
    			attr_dev(p22, "class", "category-main-text d-inline");
    			add_location(p22, file$7, 662, 48, 60864);
    			attr_dev(a57, "href", "#");
    			attr_dev(a57, "class", "category-main-text-link");
    			add_location(a57, file$7, 661, 46, 60771);
    			attr_dev(h519, "class", "mb-0");
    			add_location(h519, file$7, 659, 44, 60497);
    			attr_dev(div116, "class", "border-bottom pb-2");
    			attr_dev(div116, "id", "headingTwo");
    			add_location(div116, file$7, 658, 42, 60404);
    			attr_dev(i36, "class", "fas fa-dot-circle p-0 d-inline category_button-non");
    			add_location(i36, file$7, 669, 50, 61414);
    			attr_dev(p23, "class", "category-main-text d-inline");
    			add_location(p23, file$7, 671, 52, 61629);
    			attr_dev(a58, "href", "#");
    			attr_dev(a58, "class", "category-main-text-link");
    			add_location(a58, file$7, 670, 50, 61532);
    			attr_dev(h520, "class", "mb-0");
    			add_location(h520, file$7, 668, 48, 61346);
    			attr_dev(div117, "class", "border-bottom py-2");
    			attr_dev(div117, "id", "");
    			add_location(div117, file$7, 667, 44, 61259);
    			attr_dev(div118, "id", "collapseTwo");
    			attr_dev(div118, "class", "collapse mr-3");
    			attr_dev(div118, "aria-labelledby", "headingTwo");
    			attr_dev(div118, "data-parent", "#accordion");
    			add_location(div118, file$7, 666, 42, 61116);
    			attr_dev(div119, "class", "mb-2 pl-2");
    			add_location(div119, file$7, 657, 40, 60338);
    			attr_dev(a59, "href", "#");
    			attr_dev(a59, "class", "p-0 d-inline category_button collapsed");
    			attr_dev(a59, "data-toggle", "collapse");
    			attr_dev(a59, "data-target", "#collapseThree");
    			attr_dev(a59, "aria-expanded", "false");
    			attr_dev(a59, "aria-controls", "collapseThree");
    			add_location(a59, file$7, 680, 46, 62204);
    			attr_dev(p24, "class", "category-main-text d-inline");
    			add_location(p24, file$7, 682, 48, 62511);
    			attr_dev(a60, "href", "#");
    			attr_dev(a60, "class", "category-main-text-link");
    			add_location(a60, file$7, 681, 46, 62418);
    			attr_dev(h521, "class", "mb-0");
    			add_location(h521, file$7, 679, 44, 62140);
    			attr_dev(div120, "class", "border-bottom pb-2");
    			attr_dev(div120, "id", "headingThree");
    			add_location(div120, file$7, 678, 42, 62045);
    			attr_dev(i37, "class", "fas fa-dot-circle p-0 d-inline category_button-non");
    			add_location(i37, file$7, 689, 50, 63062);
    			attr_dev(p25, "class", "category-main-text d-inline");
    			add_location(p25, file$7, 691, 52, 63277);
    			attr_dev(a61, "href", "#");
    			attr_dev(a61, "class", "category-main-text-link");
    			add_location(a61, file$7, 690, 50, 63180);
    			attr_dev(h522, "class", "mb-0");
    			add_location(h522, file$7, 688, 48, 62994);
    			attr_dev(div121, "class", "border-bottom py-2");
    			attr_dev(div121, "id", "");
    			add_location(div121, file$7, 687, 44, 62907);
    			attr_dev(div122, "id", "collapseThree");
    			attr_dev(div122, "class", "collapse mr-3");
    			attr_dev(div122, "aria-labelledby", "headingThree");
    			attr_dev(div122, "data-parent", "#accordion");
    			add_location(div122, file$7, 686, 42, 62760);
    			attr_dev(div123, "class", "mb-2 pl-2");
    			add_location(div123, file$7, 677, 40, 61979);
    			attr_dev(a62, "href", "#");
    			attr_dev(a62, "class", "p-0 d-inline category_button collapsed");
    			attr_dev(a62, "data-toggle", "collapse");
    			attr_dev(a62, "data-target", "#collapseThree");
    			attr_dev(a62, "aria-expanded", "false");
    			attr_dev(a62, "aria-controls", "collapseThree");
    			add_location(a62, file$7, 700, 46, 63853);
    			attr_dev(p26, "class", "category-main-text d-inline");
    			add_location(p26, file$7, 702, 48, 64160);
    			attr_dev(a63, "href", "#");
    			attr_dev(a63, "class", "category-main-text-link");
    			add_location(a63, file$7, 701, 46, 64067);
    			attr_dev(h523, "class", "mb-0");
    			add_location(h523, file$7, 699, 44, 63789);
    			attr_dev(div124, "class", "border-bottom pb-2");
    			attr_dev(div124, "id", "headingThree");
    			add_location(div124, file$7, 698, 42, 63694);
    			attr_dev(i38, "class", "fas fa-dot-circle p-0 d-inline category_button-non");
    			add_location(i38, file$7, 709, 50, 64711);
    			attr_dev(p27, "class", "category-main-text d-inline");
    			add_location(p27, file$7, 711, 52, 64926);
    			attr_dev(a64, "href", "#");
    			attr_dev(a64, "class", "category-main-text-link");
    			add_location(a64, file$7, 710, 50, 64829);
    			attr_dev(h524, "class", "mb-0");
    			add_location(h524, file$7, 708, 48, 64643);
    			attr_dev(div125, "class", "border-bottom py-2");
    			attr_dev(div125, "id", "");
    			add_location(div125, file$7, 707, 44, 64556);
    			attr_dev(div126, "id", "collapseThree");
    			attr_dev(div126, "class", "collapse mr-3");
    			attr_dev(div126, "aria-labelledby", "headingThree");
    			attr_dev(div126, "data-parent", "#accordion");
    			add_location(div126, file$7, 706, 42, 64409);
    			attr_dev(div127, "class", "mb-2 pl-2");
    			add_location(div127, file$7, 697, 40, 63628);
    			attr_dev(a65, "href", "#");
    			attr_dev(a65, "class", "p-0 d-inline category_button collapsed");
    			attr_dev(a65, "data-toggle", "collapse");
    			attr_dev(a65, "data-target", "#collapseThree");
    			attr_dev(a65, "aria-expanded", "false");
    			attr_dev(a65, "aria-controls", "collapseThree");
    			add_location(a65, file$7, 720, 46, 65502);
    			attr_dev(p28, "class", "category-main-text d-inline");
    			add_location(p28, file$7, 722, 48, 65809);
    			attr_dev(a66, "href", "#");
    			attr_dev(a66, "class", "category-main-text-link");
    			add_location(a66, file$7, 721, 46, 65716);
    			attr_dev(h525, "class", "mb-0");
    			add_location(h525, file$7, 719, 44, 65438);
    			attr_dev(div128, "class", "border-bottom pb-2");
    			attr_dev(div128, "id", "headingThree");
    			add_location(div128, file$7, 718, 42, 65343);
    			attr_dev(i39, "class", "fas fa-dot-circle p-0 d-inline category_button-non");
    			add_location(i39, file$7, 729, 50, 66360);
    			attr_dev(p29, "class", "category-main-text d-inline");
    			add_location(p29, file$7, 731, 52, 66575);
    			attr_dev(a67, "href", "#");
    			attr_dev(a67, "class", "category-main-text-link");
    			add_location(a67, file$7, 730, 50, 66478);
    			attr_dev(h526, "class", "mb-0");
    			add_location(h526, file$7, 728, 48, 66292);
    			attr_dev(div129, "class", "border-bottom py-2");
    			attr_dev(div129, "id", "");
    			add_location(div129, file$7, 727, 44, 66205);
    			attr_dev(div130, "id", "collapseThree");
    			attr_dev(div130, "class", "collapse mr-3");
    			attr_dev(div130, "aria-labelledby", "headingThree");
    			attr_dev(div130, "data-parent", "#accordion");
    			add_location(div130, file$7, 726, 42, 66058);
    			attr_dev(div131, "class", "mb-2 pl-2");
    			add_location(div131, file$7, 717, 40, 65277);
    			attr_dev(a68, "href", "#");
    			attr_dev(a68, "class", "p-0 d-inline category_button collapsed");
    			attr_dev(a68, "data-toggle", "collapse");
    			attr_dev(a68, "data-target", "#collapseThree");
    			attr_dev(a68, "aria-expanded", "false");
    			attr_dev(a68, "aria-controls", "collapseThree");
    			add_location(a68, file$7, 740, 46, 67151);
    			attr_dev(p30, "class", "category-main-text d-inline");
    			add_location(p30, file$7, 742, 48, 67458);
    			attr_dev(a69, "href", "#");
    			attr_dev(a69, "class", "category-main-text-link");
    			add_location(a69, file$7, 741, 46, 67365);
    			attr_dev(h527, "class", "mb-0");
    			add_location(h527, file$7, 739, 44, 67087);
    			attr_dev(div132, "class", "border-bottom pb-2");
    			attr_dev(div132, "id", "headingThree");
    			add_location(div132, file$7, 738, 42, 66992);
    			attr_dev(i40, "class", "fas fa-dot-circle p-0 d-inline category_button-non");
    			add_location(i40, file$7, 749, 50, 68009);
    			attr_dev(p31, "class", "category-main-text d-inline");
    			add_location(p31, file$7, 751, 52, 68224);
    			attr_dev(a70, "href", "#");
    			attr_dev(a70, "class", "category-main-text-link");
    			add_location(a70, file$7, 750, 50, 68127);
    			attr_dev(h528, "class", "mb-0");
    			add_location(h528, file$7, 748, 48, 67941);
    			attr_dev(div133, "class", "border-bottom py-2");
    			attr_dev(div133, "id", "");
    			add_location(div133, file$7, 747, 44, 67854);
    			attr_dev(div134, "id", "collapseThree");
    			attr_dev(div134, "class", "collapse mr-3");
    			attr_dev(div134, "aria-labelledby", "headingThree");
    			attr_dev(div134, "data-parent", "#accordion");
    			add_location(div134, file$7, 746, 42, 67707);
    			attr_dev(div135, "class", "mb-2 pl-2");
    			add_location(div135, file$7, 737, 40, 66926);
    			attr_dev(div136, "id", "accordion");

    			attr_dev(div136, "class", div136_class_value = /*x*/ ctx[1] <= 767
    			? "modal-dialog modal-content pr-2"
    			: "");

    			attr_dev(div136, "role", div136_role_value = /*x*/ ctx[1] <= 767 ? "document" : "");
    			add_location(div136, file$7, 419, 36, 37237);
    			attr_dev(div137, "class", div137_class_value = "modal-category-main " + (/*x*/ ctx[1] <= 767 ? "modal right " : "") + " mt-2 mr-1 col-12 p-0 d-lg-inline");
    			attr_dev(div137, "id", div137_id_value = /*x*/ ctx[1] <= 767 ? "mod2" : "");
    			attr_dev(div137, "tabindex", div137_tabindex_value = /*x*/ ctx[1] <= 767 ? "-1" : "");
    			attr_dev(div137, "role", div137_role_value = /*x*/ ctx[1] <= 767 ? "dialog" : "");
    			attr_dev(div137, "aria-hidden", "true");
    			add_location(div137, file$7, 418, 32, 36992);

    			attr_dev(div138, "class", div138_class_value = " " + (/*x*/ ctx[1] >= 767
    			? "row direction shadow-radius-section mt-4 py-2 bg-white"
    			: "row direction ") + " ");

    			add_location(div138, file$7, 411, 30, 36167);
    			attr_dev(div139, "class", "stick-here");
    			add_location(div139, file$7, 760, 30, 68686);

    			attr_dev(div140, "class", div140_class_value = /*y*/ ctx[0] > 700 && /*x*/ ctx[1] > 767
    			? "sticky-top-custom"
    			: "");

    			add_location(div140, file$7, 409, 28, 35999);
    			attr_dev(aside2, "class", "col-12 col-md-3 mt-3");
    			add_location(aside2, file$7, 397, 24, 35285);
    			attr_dev(div141, "class", "row px-0 mx-0");
    			add_location(div141, file$7, 186, 20, 9363);
    			attr_dev(div142, "id", "post");
    			attr_dev(div142, "class", "row tab-pane");
    			toggle_class(div142, "active", /*current*/ ctx[4] === "post");
    			add_location(div142, file$7, 185, 16, 9272);
    			attr_dev(h529, "class", "text-bold mb-2");
    			add_location(h529, file$7, 770, 32, 69199);
    			attr_dev(p32, "class", "text-secondary text-justify word-space");
    			add_location(p32, file$7, 771, 32, 69277);
    			attr_dev(div143, "class", "col-6 text-bold pr-0");
    			add_location(div143, file$7, 778, 40, 70004);
    			attr_dev(a71, "class", "text-primary");
    			attr_dev(a71, "href", "#");
    			add_location(a71, file$7, 780, 44, 70175);
    			attr_dev(div144, "class", "col-6 text-bold pr-0 mb-4");
    			add_location(div144, file$7, 779, 40, 70091);
    			attr_dev(div145, "class", "col-6 text-bold pr-0");
    			add_location(div145, file$7, 784, 40, 70413);
    			attr_dev(div146, "class", "col-6 pr-0 mb-4 text-secondary");
    			add_location(div146, file$7, 785, 40, 70504);
    			attr_dev(div147, "class", "col-6 text-bold pr-0");
    			add_location(div147, file$7, 788, 40, 70710);
    			attr_dev(div148, "class", "col-6 pr-0 mb-4 text-secondary");
    			add_location(div148, file$7, 789, 40, 70804);
    			attr_dev(div149, "class", "col-6 text-bold pr-0");
    			add_location(div149, file$7, 792, 40, 70993);
    			attr_dev(div150, "class", "col-6 pr-0 mb-4 text-secondary");
    			add_location(div150, file$7, 793, 40, 71085);
    			attr_dev(div151, "class", "col-6 text-bold pr-0");
    			add_location(div151, file$7, 796, 40, 71266);
    			attr_dev(div152, "class", "col-6 pr-0 mb-4 text-secondary");
    			add_location(div152, file$7, 797, 40, 71354);
    			attr_dev(div153, "class", "col-6 text-bold pr-0");
    			add_location(div153, file$7, 800, 40, 71557);
    			attr_dev(div154, "class", "col-6 pr-0 mb-4 text-secondary");
    			add_location(div154, file$7, 801, 40, 71647);
    			attr_dev(div155, "class", "row ");
    			add_location(div155, file$7, 777, 36, 69945);
    			attr_dev(div156, "class", "col-12");
    			add_location(div156, file$7, 776, 32, 69888);
    			attr_dev(div157, "class", "col-12 ");
    			add_location(div157, file$7, 769, 28, 69145);
    			attr_dev(div158, "class", "row bg-white shadow-radius-section ml-1 py-4 px-1");
    			add_location(div158, file$7, 768, 24, 69053);
    			attr_dev(h530, "class", "text-bold ");
    			add_location(h530, file$7, 810, 32, 72138);
    			attr_dev(p33, "class", "text-secondary text-justify word-space");
    			add_location(p33, file$7, 811, 32, 72218);
    			attr_dev(div159, "class", "row");
    			add_location(div159, file$7, 814, 32, 72409);
    			attr_dev(div160, "class", "col-12 ");
    			add_location(div160, file$7, 809, 28, 72084);
    			attr_dev(div161, "class", "row bg-white shadow-radius-section ml-1 py-4 px-1 mt-3");
    			add_location(div161, file$7, 808, 24, 71987);
    			attr_dev(div162, "class", "col-12 direction ");
    			add_location(div162, file$7, 767, 20, 68997);
    			attr_dev(div163, "id", "about");
    			attr_dev(div163, "class", "row tab-pane mt-3 margin-about-right");
    			toggle_class(div163, "active", /*current*/ ctx[4] === "about");
    			add_location(div163, file$7, 766, 16, 68880);
    			attr_dev(div164, "class", "tab-content w-100 mr-0 ");
    			add_location(div164, file$7, 184, 12, 9218);
    			attr_dev(aside3, "class", "col-12 col-lg-8  ");
    			add_location(aside3, file$7, 138, 8, 5611);
    			attr_dev(div165, "class", "row justify-content-center mx-0");
    			add_location(div165, file$7, 123, 4, 4967);
    			attr_dev(main, "class", "container-fluid pin-parent px-0");
    			add_location(main, file$7, 121, 0, 4894);
    			add_location(br0, file$7, 827, 0, 72692);
    			add_location(br1, file$7, 827, 4, 72696);
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div165);
    			append_dev(div165, aside0);
    			append_dev(aside0, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, a0);
    			append_dev(a0, img0);
    			append_dev(div165, t1);
    			append_dev(div165, aside3);
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
    			append_dev(div9, h4);
    			append_dev(h4, t4);
    			append_dev(h4, i0);
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
    			append_dev(aside3, div164);
    			append_dev(div164, div142);
    			append_dev(div142, div141);
    			append_dev(div141, aside1);
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
    			append_dev(div25, h30);
    			append_dev(h30, a9);
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
    			append_dev(div38, h31);
    			append_dev(h31, a16);
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
    			append_dev(div51, h32);
    			append_dev(h32, a23);
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
    			append_dev(div141, t102);
    			append_dev(div141, aside2);
    			append_dev(aside2, div58);
    			append_dev(div58, div57);
    			append_dev(div57, img12);
    			append_dev(div58, t103);
    			append_dev(div58, h33);
    			append_dev(div58, t105);
    			append_dev(div58, h65);
    			append_dev(aside2, t107);
    			append_dev(aside2, div140);
    			append_dev(div140, div138);
    			append_dev(div138, div59);
    			append_dev(div59, a26);
    			append_dev(a26, i26);
    			append_dev(a26, t108);
    			append_dev(div59, span15);
    			append_dev(div138, t110);
    			append_dev(div138, div137);
    			append_dev(div137, div136);
    			if (if_block1) if_block1.m(div136, null);
    			append_dev(div136, t111);
    			append_dev(div136, div115);
    			append_dev(div115, div60);
    			append_dev(div60, h50);
    			append_dev(h50, i27);
    			append_dev(h50, t112);
    			append_dev(h50, a27);
    			append_dev(a27, p3);
    			append_dev(div115, t114);
    			append_dev(div115, div61);
    			append_dev(div61, h51);
    			append_dev(h51, a28);
    			append_dev(h51, t115);
    			append_dev(h51, a29);
    			append_dev(a29, p4);
    			append_dev(div115, t117);
    			append_dev(div115, div87);
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
    			append_dev(div115, t143);
    			append_dev(div115, div88);
    			append_dev(div88, h510);
    			append_dev(h510, a42);
    			append_dev(h510, t144);
    			append_dev(h510, a43);
    			append_dev(a43, p13);
    			append_dev(div115, t146);
    			append_dev(div115, div114);
    			append_dev(div114, div113);
    			append_dev(div113, div112);
    			append_dev(div112, div111);
    			append_dev(div111, div110);
    			append_dev(div110, div89);
    			append_dev(div89, h511);
    			append_dev(h511, a44);
    			append_dev(h511, t147);
    			append_dev(h511, a45);
    			append_dev(a45, p14);
    			append_dev(div110, t149);
    			append_dev(div110, div92);
    			append_dev(div92, div91);
    			append_dev(div91, div90);
    			append_dev(div90, h512);
    			append_dev(h512, i32);
    			append_dev(h512, t150);
    			append_dev(h512, a46);
    			append_dev(a46, p15);
    			append_dev(div110, t152);
    			append_dev(div110, div96);
    			append_dev(div96, div93);
    			append_dev(div93, h513);
    			append_dev(h513, a47);
    			append_dev(h513, t153);
    			append_dev(h513, a48);
    			append_dev(a48, p16);
    			append_dev(div96, t155);
    			append_dev(div96, div95);
    			append_dev(div95, div94);
    			append_dev(div94, h514);
    			append_dev(h514, i33);
    			append_dev(h514, t156);
    			append_dev(h514, a49);
    			append_dev(a49, p17);
    			append_dev(div110, t158);
    			append_dev(div110, div109);
    			append_dev(div109, div97);
    			append_dev(div97, h515);
    			append_dev(h515, a50);
    			append_dev(h515, t159);
    			append_dev(h515, a51);
    			append_dev(a51, p18);
    			append_dev(div109, t161);
    			append_dev(div109, div108);
    			append_dev(div108, div107);
    			append_dev(div107, div106);
    			append_dev(div106, div105);
    			append_dev(div105, div101);
    			append_dev(div101, div98);
    			append_dev(div98, h516);
    			append_dev(h516, a52);
    			append_dev(h516, t162);
    			append_dev(h516, a53);
    			append_dev(a53, p19);
    			append_dev(div101, t164);
    			append_dev(div101, div100);
    			append_dev(div100, div99);
    			append_dev(div99, h517);
    			append_dev(h517, i34);
    			append_dev(h517, t165);
    			append_dev(h517, a54);
    			append_dev(a54, p20);
    			append_dev(div105, t167);
    			append_dev(div105, div102);
    			append_dev(div102, h518);
    			append_dev(h518, i35);
    			append_dev(h518, t168);
    			append_dev(h518, a55);
    			append_dev(a55, p21);
    			append_dev(div105, t170);
    			append_dev(div105, div104);
    			append_dev(div104, div103);
    			append_dev(div136, t172);
    			append_dev(div136, div119);
    			append_dev(div119, div116);
    			append_dev(div116, h519);
    			append_dev(h519, a56);
    			append_dev(h519, t173);
    			append_dev(h519, a57);
    			append_dev(a57, p22);
    			append_dev(div119, t175);
    			append_dev(div119, div118);
    			append_dev(div118, div117);
    			append_dev(div117, h520);
    			append_dev(h520, i36);
    			append_dev(h520, t176);
    			append_dev(h520, a58);
    			append_dev(a58, p23);
    			append_dev(div136, t178);
    			append_dev(div136, div123);
    			append_dev(div123, div120);
    			append_dev(div120, h521);
    			append_dev(h521, a59);
    			append_dev(h521, t179);
    			append_dev(h521, a60);
    			append_dev(a60, p24);
    			append_dev(div123, t181);
    			append_dev(div123, div122);
    			append_dev(div122, div121);
    			append_dev(div121, h522);
    			append_dev(h522, i37);
    			append_dev(h522, t182);
    			append_dev(h522, a61);
    			append_dev(a61, p25);
    			append_dev(div136, t184);
    			append_dev(div136, div127);
    			append_dev(div127, div124);
    			append_dev(div124, h523);
    			append_dev(h523, a62);
    			append_dev(h523, t185);
    			append_dev(h523, a63);
    			append_dev(a63, p26);
    			append_dev(div127, t187);
    			append_dev(div127, div126);
    			append_dev(div126, div125);
    			append_dev(div125, h524);
    			append_dev(h524, i38);
    			append_dev(h524, t188);
    			append_dev(h524, a64);
    			append_dev(a64, p27);
    			append_dev(div136, t190);
    			append_dev(div136, div131);
    			append_dev(div131, div128);
    			append_dev(div128, h525);
    			append_dev(h525, a65);
    			append_dev(h525, t191);
    			append_dev(h525, a66);
    			append_dev(a66, p28);
    			append_dev(div131, t193);
    			append_dev(div131, div130);
    			append_dev(div130, div129);
    			append_dev(div129, h526);
    			append_dev(h526, i39);
    			append_dev(h526, t194);
    			append_dev(h526, a67);
    			append_dev(a67, p29);
    			append_dev(div136, t196);
    			append_dev(div136, div135);
    			append_dev(div135, div132);
    			append_dev(div132, h527);
    			append_dev(h527, a68);
    			append_dev(h527, t197);
    			append_dev(h527, a69);
    			append_dev(a69, p30);
    			append_dev(div135, t199);
    			append_dev(div135, div134);
    			append_dev(div134, div133);
    			append_dev(div133, h528);
    			append_dev(h528, i40);
    			append_dev(h528, t200);
    			append_dev(h528, a70);
    			append_dev(a70, p31);
    			append_dev(div140, t202);
    			append_dev(div140, div139);
    			append_dev(div164, t203);
    			append_dev(div164, div163);
    			append_dev(div163, div162);
    			append_dev(div162, div158);
    			append_dev(div158, div157);
    			append_dev(div157, h529);
    			append_dev(div157, t205);
    			append_dev(div157, p32);
    			append_dev(div157, t207);
    			append_dev(div157, div156);
    			append_dev(div156, div155);
    			append_dev(div155, div143);
    			append_dev(div155, t209);
    			append_dev(div155, div144);
    			append_dev(div144, a71);
    			append_dev(div155, t211);
    			append_dev(div155, div145);
    			append_dev(div155, t213);
    			append_dev(div155, div146);
    			append_dev(div155, t215);
    			append_dev(div155, div147);
    			append_dev(div155, t217);
    			append_dev(div155, div148);
    			append_dev(div155, t219);
    			append_dev(div155, div149);
    			append_dev(div155, t221);
    			append_dev(div155, div150);
    			append_dev(div155, t223);
    			append_dev(div155, div151);
    			append_dev(div155, t225);
    			append_dev(div155, div152);
    			append_dev(div155, t227);
    			append_dev(div155, div153);
    			append_dev(div155, t229);
    			append_dev(div155, div154);
    			append_dev(div162, t231);
    			append_dev(div162, div161);
    			append_dev(div161, div160);
    			append_dev(div160, h530);
    			append_dev(div160, t233);
    			append_dev(div160, p33);
    			append_dev(div160, t235);
    			append_dev(div160, div159);
    			insert_dev(target, t236, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, br1, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(a3, "click", /*click_handler_2*/ ctx[9], false, false, false),
    					listen_dev(a4, "click", /*click_handler_3*/ ctx[10], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*y*/ ctx[0] > 450) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*y*/ 1) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_1$2(ctx);
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

    			if (!current || dirty & /*x*/ 2 && div6_class_value !== (div6_class_value = "" + ((/*x*/ ctx[1] <= 320 ? "col-12" : "col-5") + " col-md-3 justify-content-start navbar dropleft pr-1"))) {
    				attr_dev(div6, "class", div6_class_value);
    			}

    			if (dirty & /*current*/ 16) {
    				toggle_class(a3, "active", /*current*/ ctx[4] === "about");
    			}

    			if (dirty & /*current*/ 16) {
    				toggle_class(a4, "active", /*current*/ ctx[4] === "post");
    			}

    			if (dirty & /*x*/ 2) {
    				toggle_class(div58, "d-none", /*x*/ ctx[1] <= 767);
    			}

    			if (!current || dirty & /*x*/ 2 && i26_class_value !== (i26_class_value = "" + ((/*x*/ ctx[1] >= 767
    			? "fas fa-list-ul category-icon-modal"
    			: "fas fa-caret-left") + " "))) {
    				attr_dev(i26, "class", i26_class_value);
    			}

    			if (dirty & /*x, x, y*/ 3) {
    				toggle_class(i26, "category-fixed-icon-modal", /*x*/ ctx[1] <= 767 && /*y*/ ctx[0] >= 400);
    			}

    			if (!current || dirty & /*x*/ 2 && a26_type_value !== (a26_type_value = /*x*/ ctx[1] <= 767 ? "button" : "")) {
    				attr_dev(a26, "type", a26_type_value);
    			}

    			if (!current || dirty & /*x*/ 2 && a26_data_toggle_value !== (a26_data_toggle_value = /*x*/ ctx[1] <= 767 ? "modal" : "")) {
    				attr_dev(a26, "data-toggle", a26_data_toggle_value);
    			}

    			if (!current || dirty & /*x*/ 2 && a26_data_target_value !== (a26_data_target_value = /*x*/ ctx[1] <= 767 ? "#mod2" : "")) {
    				attr_dev(a26, "data-target", a26_data_target_value);
    			}

    			if (!current || dirty & /*x*/ 2 && div59_class_value !== (div59_class_value = /*x*/ ctx[1] >= 767
    			? "col-12 font-weight-bold pb-2 border-bottom pr-0"
    			: "col-12 font-weight-bold")) {
    				attr_dev(div59, "class", div59_class_value);
    			}

    			if (/*x*/ ctx[1] <= 767) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block$4(ctx);
    					if_block1.c();
    					if_block1.m(div136, t111);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (!current || dirty & /*x*/ 2 && div136_class_value !== (div136_class_value = /*x*/ ctx[1] <= 767
    			? "modal-dialog modal-content pr-2"
    			: "")) {
    				attr_dev(div136, "class", div136_class_value);
    			}

    			if (!current || dirty & /*x*/ 2 && div136_role_value !== (div136_role_value = /*x*/ ctx[1] <= 767 ? "document" : "")) {
    				attr_dev(div136, "role", div136_role_value);
    			}

    			if (!current || dirty & /*x*/ 2 && div137_class_value !== (div137_class_value = "modal-category-main " + (/*x*/ ctx[1] <= 767 ? "modal right " : "") + " mt-2 mr-1 col-12 p-0 d-lg-inline")) {
    				attr_dev(div137, "class", div137_class_value);
    			}

    			if (!current || dirty & /*x*/ 2 && div137_id_value !== (div137_id_value = /*x*/ ctx[1] <= 767 ? "mod2" : "")) {
    				attr_dev(div137, "id", div137_id_value);
    			}

    			if (!current || dirty & /*x*/ 2 && div137_tabindex_value !== (div137_tabindex_value = /*x*/ ctx[1] <= 767 ? "-1" : "")) {
    				attr_dev(div137, "tabindex", div137_tabindex_value);
    			}

    			if (!current || dirty & /*x*/ 2 && div137_role_value !== (div137_role_value = /*x*/ ctx[1] <= 767 ? "dialog" : "")) {
    				attr_dev(div137, "role", div137_role_value);
    			}

    			if (!current || dirty & /*x*/ 2 && div138_class_value !== (div138_class_value = " " + (/*x*/ ctx[1] >= 767
    			? "row direction shadow-radius-section mt-4 py-2 bg-white"
    			: "row direction ") + " ")) {
    				attr_dev(div138, "class", div138_class_value);
    			}

    			if (!current || dirty & /*y, x*/ 3 && div140_class_value !== (div140_class_value = /*y*/ ctx[0] > 700 && /*x*/ ctx[1] > 767
    			? "sticky-top-custom"
    			: "")) {
    				attr_dev(div140, "class", div140_class_value);
    			}

    			if (dirty & /*current*/ 16) {
    				toggle_class(div142, "active", /*current*/ ctx[4] === "post");
    			}

    			if (dirty & /*current*/ 16) {
    				toggle_class(div163, "active", /*current*/ ctx[4] === "about");
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
    			if (detaching) detach_dev(t236);
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
    		source: "(74:0) <Router url=\\\"{url}\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
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
    	add_render_callback(/*onwindowscroll*/ ctx[5]);
    	add_render_callback(/*onwindowresize*/ ctx[6]);

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
    					listen_dev(window_1$4, "scroll", () => {
    						scrolling = true;
    						clearTimeout(scrolling_timeout);
    						scrolling_timeout = setTimeout(clear_scrolling, 100);
    						/*onwindowscroll*/ ctx[5]();
    					}),
    					listen_dev(window_1$4, "resize", /*onwindowresize*/ ctx[6])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*y*/ 1 && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window_1$4.pageXOffset, /*y*/ ctx[0]);
    				scrolling_timeout = setTimeout(clear_scrolling, 100);
    			}

    			const router_changes = {};
    			if (dirty & /*url*/ 4) router_changes.url = /*url*/ ctx[2];

    			if (dirty & /*$$scope, current, y, x*/ 524307) {
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
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Magezine", slots, []);
    	let { url = "" } = $$props;
    	let { y } = $$props;
    	let { x } = $$props;
    	let innerHeight;
    	let clientHeight;

    	//$: console.log(x);
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
    	window.jQuery = jquery;
    	const writable_props = ["url", "y", "x"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Magezine> was created with unknown prop '${key}'`);
    	});

    	function onwindowscroll() {
    		$$invalidate(0, y = window_1$4.pageYOffset);
    	}

    	function onwindowresize() {
    		$$invalidate(1, x = window_1$4.innerWidth);
    		$$invalidate(3, innerHeight = window_1$4.innerHeight);
    	}

    	const click_handler = () => $$invalidate(4, current = "about");
    	const click_handler_1 = () => $$invalidate(4, current = "post");
    	const click_handler_2 = () => $$invalidate(4, current = "about");
    	const click_handler_3 = () => $$invalidate(4, current = "post");

    	$$self.$$set = $$props => {
    		if ("url" in $$props) $$invalidate(2, url = $$props.url);
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    		if ("x" in $$props) $$invalidate(1, x = $$props.x);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		jQuery: jquery,
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
    		innerHeight,
    		clientHeight,
    		urlParams,
    		id,
    		isOpen,
    		current,
    		toggleNav,
    		currentLocation,
    		splitUrl,
    		lastSugment
    	});

    	$$self.$inject_state = $$props => {
    		if ("url" in $$props) $$invalidate(2, url = $$props.url);
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    		if ("x" in $$props) $$invalidate(1, x = $$props.x);
    		if ("innerHeight" in $$props) $$invalidate(3, innerHeight = $$props.innerHeight);
    		if ("clientHeight" in $$props) clientHeight = $$props.clientHeight;
    		if ("isOpen" in $$props) isOpen = $$props.isOpen;
    		if ("current" in $$props) $$invalidate(4, current = $$props.current);
    		if ("currentLocation" in $$props) currentLocation = $$props.currentLocation;
    		if ("splitUrl" in $$props) splitUrl = $$props.splitUrl;
    		if ("lastSugment" in $$props) lastSugment = $$props.lastSugment;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		y,
    		x,
    		url,
    		innerHeight,
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
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { url: 2, y: 0, x: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Magezine",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*y*/ ctx[0] === undefined && !("y" in props)) {
    			console_1.warn("<Magezine> was created without expected prop 'y'");
    		}

    		if (/*x*/ ctx[1] === undefined && !("x" in props)) {
    			console_1.warn("<Magezine> was created without expected prop 'x'");
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

    const { window: window_1$3 } = globals;
    const file$6 = "src/pages/home.svelte";

    function create_fragment$6(ctx) {
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
    	add_render_callback(/*onwindowscroll*/ ctx[5]);
    	add_render_callback(/*onwindowresize*/ ctx[6]);

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
    			add_location(aside0, file$6, 41, 8, 1161);
    			attr_dev(img0, "class", "image-pin-top");
    			if (img0.src !== (img0_src_value = "image/30.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$6, 46, 24, 1608);
    			add_location(h50, file$6, 48, 28, 1757);
    			attr_dev(a0, "class", "w-100 content-pin-top");
    			attr_dev(a0, "href", "#");
    			add_location(a0, file$6, 47, 24, 1686);
    			if (img1.src !== (img1_src_value = "/image/26.jpeg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "mag-img-top");
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$6, 51, 28, 1904);
    			attr_dev(a1, "href", "#");
    			add_location(a1, file$6, 50, 24, 1863);
    			set_style(i0, "color", "mediumspringgreen");
    			attr_dev(i0, "class", "fas fa-check-circle");
    			add_location(i0, file$6, 54, 60, 2105);
    			add_location(span0, file$6, 54, 28, 2073);
    			attr_dev(i1, "class", "fas fa-clock");
    			add_location(i1, file$6, 54, 144, 2189);
    			attr_dev(div0, "class", "author-time-pin-top");
    			add_location(div0, file$6, 53, 24, 2011);
    			attr_dev(article0, "class", "col-12 mb-md-4 first-article-main ");
    			toggle_class(article0, "pin-article-height", /*h*/ ctx[2] <= 465);
    			add_location(article0, file$6, 45, 20, 1497);
    			attr_dev(div1, "class", "col-12 mb-4 my-md-0");
    			add_location(div1, file$6, 44, 16, 1443);
    			attr_dev(img2, "class", "image-pin w-100");
    			if (img2.src !== (img2_src_value = "image/28.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$6, 60, 24, 2492);
    			add_location(h51, file$6, 62, 28, 2639);
    			attr_dev(a2, "class", "w-100 content-pin");
    			attr_dev(a2, "href", "#");
    			add_location(a2, file$6, 61, 24, 2572);
    			if (img3.src !== (img3_src_value = "/image/27.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "class", "mag-img");
    			attr_dev(img3, "alt", "");
    			add_location(img3, file$6, 65, 28, 2786);
    			attr_dev(a3, "href", "#");
    			add_location(a3, file$6, 64, 24, 2745);
    			set_style(i2, "color", "mediumspringgreen");
    			attr_dev(i2, "class", "fas fa-check-circle");
    			add_location(i2, file$6, 68, 42, 2960);
    			add_location(span1, file$6, 68, 28, 2946);
    			attr_dev(i3, "class", "fas fa-clock");
    			add_location(i3, file$6, 68, 126, 3044);
    			attr_dev(div2, "class", "author-time-pin");
    			add_location(div2, file$6, 67, 24, 2888);
    			attr_dev(article1, "class", "col-12");
    			toggle_class(article1, "pin-article-height", /*h*/ ctx[2] <= 465);
    			add_location(article1, file$6, 59, 20, 2409);
    			attr_dev(div3, "class", "col-12 col-xl-6 mb-4 my-md-0 pin-article-main");
    			add_location(div3, file$6, 58, 16, 2329);
    			attr_dev(img4, "class", "image-pin w-100");
    			if (img4.src !== (img4_src_value = "image/20.jpg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "");
    			add_location(img4, file$6, 74, 24, 3364);
    			add_location(h52, file$6, 76, 28, 3511);
    			attr_dev(a4, "class", "w-100 content-pin");
    			attr_dev(a4, "href", "#");
    			add_location(a4, file$6, 75, 24, 3444);
    			if (img5.src !== (img5_src_value = "/image/25.jpg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "class", "mag-img");
    			attr_dev(img5, "alt", "");
    			add_location(img5, file$6, 79, 28, 3637);
    			attr_dev(a5, "href", "#");
    			add_location(a5, file$6, 78, 24, 3596);
    			set_style(i4, "color", "mediumspringgreen");
    			attr_dev(i4, "class", "fas fa-check-circle");
    			add_location(i4, file$6, 82, 49, 3818);
    			add_location(span2, file$6, 82, 28, 3797);
    			attr_dev(i5, "class", "fas fa-clock");
    			add_location(i5, file$6, 82, 133, 3902);
    			attr_dev(div4, "class", "author-time-pin");
    			add_location(div4, file$6, 81, 24, 3739);
    			attr_dev(article2, "class", "col-12");
    			toggle_class(article2, "pin-article-height", /*h*/ ctx[2] <= 465);
    			add_location(article2, file$6, 73, 20, 3281);
    			attr_dev(div5, "class", "col-12 col-xl-6 mb-4 mt-lg-4 mt-xl-0 mt-md-4  pin-article-main");
    			add_location(div5, file$6, 72, 16, 3184);
    			attr_dev(section0, "class", "row justify-content-md-center mx-0 pt-3 bg-light shadow-radius-section");
    			add_location(section0, file$6, 43, 12, 1337);
    			attr_dev(img6, "class", "cu-image-com mr-1 ");
    			if (img6.src !== (img6_src_value = "image/afarine.jpg")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "alt", "");
    			add_location(img6, file$6, 95, 44, 4667);
    			attr_dev(div6, "class", "col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width");
    			add_location(div6, file$6, 94, 40, 4553);
    			set_style(i6, "color", "#048af7");
    			attr_dev(i6, "class", "fas fa-check-circle");
    			add_location(i6, file$6, 99, 125, 5146);
    			attr_dev(a6, "href", "magezine");
    			attr_dev(a6, "class", "title-post-link");
    			add_location(a6, file$6, 99, 52, 5073);
    			add_location(h60, file$6, 99, 48, 5069);
    			attr_dev(i7, "class", "fas fa-clock");
    			add_location(i7, file$6, 100, 80, 5294);
    			attr_dev(span3, "class", "show-time-custome");
    			add_location(span3, file$6, 100, 48, 5262);
    			attr_dev(div7, "class", "cu-intro mt-2");
    			add_location(div7, file$6, 98, 44, 4993);
    			attr_dev(div8, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-3 pr-md-4 pr-xl-3 mr-lg-0 mr-lg-1 mr-xl-0 justify-content-center custome-margin-right ");
    			add_location(div8, file$6, 97, 40, 4818);
    			attr_dev(div9, "class", "row ");
    			add_location(div9, file$6, 93, 36, 4494);
    			attr_dev(div10, "class", "col-11 col-md-11");
    			add_location(div10, file$6, 92, 32, 4426);
    			attr_dev(i8, "class", "fas fa-ellipsis-h -1 ");
    			attr_dev(i8, "type", "button");
    			attr_dev(i8, "data-toggle", "dropdown");
    			add_location(i8, file$6, 106, 36, 5680);
    			attr_dev(i9, "class", "far fa-bookmark");
    			add_location(i9, file$6, 108, 120, 5952);
    			attr_dev(a7, "class", "dropdown-item");
    			attr_dev(a7, "href", "#");
    			add_location(a7, file$6, 108, 85, 5917);
    			add_location(li0, file$6, 108, 40, 5872);
    			attr_dev(i10, "class", "fas fa-share-alt");
    			add_location(i10, file$6, 109, 78, 6087);
    			attr_dev(a8, "class", "dropdown-item");
    			attr_dev(a8, "href", "#");
    			add_location(a8, file$6, 109, 44, 6053);
    			add_location(li1, file$6, 109, 40, 6049);
    			attr_dev(i11, "class", "fas fa-flag");
    			add_location(i11, file$6, 110, 78, 6222);
    			attr_dev(a9, "class", "dropdown-item");
    			attr_dev(a9, "href", "#");
    			add_location(a9, file$6, 110, 44, 6188);
    			add_location(li2, file$6, 110, 40, 6184);
    			attr_dev(ul0, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul0, file$6, 107, 36, 5791);
    			attr_dev(div11, "class", "report navbar col-1 ml-0 pl-0 pr-3 pr-sm-4 pr-md-1 pr-lg-3 pr-xl-4 dropdown");
    			add_location(div11, file$6, 105, 32, 5554);
    			attr_dev(div12, "class", "row justify-content-between p-2 pl-4 pl-md-2 ");
    			add_location(div12, file$6, 91, 28, 4334);
    			attr_dev(div13, "class", "col-12");
    			add_location(div13, file$6, 90, 24, 4285);
    			attr_dev(a10, "class", "title-post-link");
    			attr_dev(a10, "href", "magezine/show-detail");
    			add_location(a10, file$6, 117, 72, 6563);
    			attr_dev(h30, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h30, file$6, 117, 28, 6519);
    			attr_dev(div14, "class", "col-12 p-0");
    			add_location(div14, file$6, 116, 24, 6466);
    			if (img7.src !== (img7_src_value = "image/30.jpg")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img7, "alt", "");
    			add_location(img7, file$6, 120, 28, 6791);
    			attr_dev(div15, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div15, file$6, 119, 24, 6705);
    			attr_dev(span4, "class", "content d-inline");
    			add_location(span4, file$6, 123, 32, 7009);
    			attr_dev(span5, "class", "read-more-custom");
    			attr_dev(span5, "onclick", "readMore(this)");
    			set_style(span5, "cursor", "pointer");
    			add_location(span5, file$6, 135, 32, 10400);
    			attr_dev(button0, "class", "btn btn-sm btn-danger col-12 my-1 p-1 offset-0 font-family");
    			add_location(button0, file$6, 139, 44, 10794);
    			attr_dev(a11, "href", "magezine/show-detail");
    			attr_dev(a11, "class", "col-3 col-md-2 px-0");
    			add_location(a11, file$6, 138, 40, 10690);
    			attr_dev(div16, "class", "row pl-0 ml-0 pt-2 justify-content-end ");
    			add_location(div16, file$6, 137, 36, 10596);
    			attr_dev(span6, "class", "read-more ");
    			add_location(span6, file$6, 136, 32, 10534);
    			attr_dev(p0, "class", "post-text col-12 mt-3 post-text");
    			add_location(p0, file$6, 122, 28, 6933);
    			attr_dev(img8, "class", "personal-img");
    			if (img8.src !== (img8_src_value = "image/1.jpeg")) attr_dev(img8, "src", img8_src_value);
    			attr_dev(img8, "alt", "");
    			add_location(img8, file$6, 148, 32, 11252);
    			attr_dev(span7, "class", "personal-name");
    			add_location(span7, file$6, 149, 32, 11337);
    			attr_dev(a12, "class", "a-clicked");
    			attr_dev(a12, "href", "profile");
    			add_location(a12, file$6, 147, 28, 11183);
    			attr_dev(i12, "class", "fas fa-eye");
    			add_location(i12, file$6, 151, 52, 11488);
    			attr_dev(div17, "class", "view-count");
    			add_location(div17, file$6, 151, 28, 11464);
    			attr_dev(div18, "class", "col-12 mb-1 author-show-box pt-1");
    			add_location(div18, file$6, 146, 24, 11108);
    			attr_dev(article3, "class", "p-0  shadow-radius-section shadow-section mb-4 bg-light");
    			add_location(article3, file$6, 89, 20, 4187);
    			attr_dev(img9, "class", "cu-image-com mr-1 ");
    			if (img9.src !== (img9_src_value = "image/afarine.jpg")) attr_dev(img9, "src", img9_src_value);
    			attr_dev(img9, "alt", "");
    			add_location(img9, file$6, 160, 44, 12086);
    			attr_dev(div19, "class", "col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width");
    			add_location(div19, file$6, 159, 40, 11972);
    			set_style(i13, "color", "#048af7");
    			attr_dev(i13, "class", "fas fa-check-circle");
    			add_location(i13, file$6, 164, 125, 12565);
    			attr_dev(a13, "href", "magezine");
    			attr_dev(a13, "class", "title-post-link");
    			add_location(a13, file$6, 164, 52, 12492);
    			add_location(h61, file$6, 164, 48, 12488);
    			attr_dev(i14, "class", "fas fa-clock");
    			add_location(i14, file$6, 165, 80, 12713);
    			attr_dev(span8, "class", "show-time-custome");
    			add_location(span8, file$6, 165, 48, 12681);
    			attr_dev(div20, "class", "cu-intro mt-2");
    			add_location(div20, file$6, 163, 44, 12412);
    			attr_dev(div21, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-3 pr-md-4 pr-xl-3 mr-lg-0 mr-lg-1 mr-xl-0 justify-content-center custome-margin-right ");
    			add_location(div21, file$6, 162, 40, 12237);
    			attr_dev(div22, "class", "row ");
    			add_location(div22, file$6, 158, 36, 11913);
    			attr_dev(div23, "class", "col-11 col-md-11");
    			add_location(div23, file$6, 157, 32, 11845);
    			attr_dev(i15, "class", "fas fa-ellipsis-h -1 ");
    			attr_dev(i15, "type", "button");
    			attr_dev(i15, "data-toggle", "dropdown");
    			add_location(i15, file$6, 171, 36, 13099);
    			attr_dev(i16, "class", "far fa-bookmark");
    			add_location(i16, file$6, 173, 120, 13371);
    			attr_dev(a14, "class", "dropdown-item");
    			attr_dev(a14, "href", "#");
    			add_location(a14, file$6, 173, 85, 13336);
    			add_location(li3, file$6, 173, 40, 13291);
    			attr_dev(i17, "class", "fas fa-share-alt");
    			add_location(i17, file$6, 174, 78, 13506);
    			attr_dev(a15, "class", "dropdown-item");
    			attr_dev(a15, "href", "#");
    			add_location(a15, file$6, 174, 44, 13472);
    			add_location(li4, file$6, 174, 40, 13468);
    			attr_dev(i18, "class", "fas fa-flag");
    			add_location(i18, file$6, 175, 78, 13641);
    			attr_dev(a16, "class", "dropdown-item");
    			attr_dev(a16, "href", "#");
    			add_location(a16, file$6, 175, 44, 13607);
    			add_location(li5, file$6, 175, 40, 13603);
    			attr_dev(ul1, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul1, file$6, 172, 36, 13210);
    			attr_dev(div24, "class", "report navbar col-1 ml-0 pl-0 pr-3 pr-sm-4 pr-md-1 pr-lg-3 pr-xl-4 dropdown");
    			add_location(div24, file$6, 170, 32, 12973);
    			attr_dev(div25, "class", "row justify-content-between p-2 pl-4 pl-md-2 ");
    			add_location(div25, file$6, 156, 28, 11753);
    			attr_dev(div26, "class", "col-12");
    			add_location(div26, file$6, 155, 24, 11704);
    			attr_dev(a17, "class", "title-post-link");
    			attr_dev(a17, "href", "magezine/show-detail");
    			add_location(a17, file$6, 182, 72, 13982);
    			attr_dev(h31, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h31, file$6, 182, 28, 13938);
    			attr_dev(div27, "class", "col-12 p-0");
    			add_location(div27, file$6, 181, 24, 13885);
    			if (img10.src !== (img10_src_value = "image/30.jpg")) attr_dev(img10, "src", img10_src_value);
    			attr_dev(img10, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img10, "alt", "");
    			add_location(img10, file$6, 185, 28, 14210);
    			attr_dev(div28, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div28, file$6, 184, 24, 14124);
    			attr_dev(span9, "class", "content d-inline");
    			add_location(span9, file$6, 188, 32, 14428);
    			attr_dev(span10, "class", "read-more-custom");
    			attr_dev(span10, "onclick", "readMore(this)");
    			set_style(span10, "cursor", "pointer");
    			add_location(span10, file$6, 200, 32, 17808);
    			attr_dev(button1, "class", "btn btn-sm btn-danger col-12 my-1 p-1 offset-0 font-family");
    			add_location(button1, file$6, 204, 44, 18202);
    			attr_dev(a18, "href", "magezine/show-detail");
    			attr_dev(a18, "class", "col-3 col-md-2 px-0");
    			add_location(a18, file$6, 203, 40, 18098);
    			attr_dev(div29, "class", "row pl-0 ml-0 pt-2 justify-content-end ");
    			add_location(div29, file$6, 202, 36, 18004);
    			attr_dev(span11, "class", "read-more ");
    			add_location(span11, file$6, 201, 32, 17942);
    			attr_dev(p1, "class", "post-text col-12 mt-3 post-text");
    			add_location(p1, file$6, 187, 28, 14352);
    			attr_dev(img11, "class", "personal-img");
    			if (img11.src !== (img11_src_value = "image/1.jpeg")) attr_dev(img11, "src", img11_src_value);
    			attr_dev(img11, "alt", "");
    			add_location(img11, file$6, 213, 32, 18660);
    			attr_dev(span12, "class", "personal-name");
    			add_location(span12, file$6, 214, 32, 18745);
    			attr_dev(a19, "class", "a-clicked");
    			attr_dev(a19, "href", "profile");
    			add_location(a19, file$6, 212, 28, 18591);
    			attr_dev(i19, "class", "fas fa-eye");
    			add_location(i19, file$6, 216, 52, 18896);
    			attr_dev(div30, "class", "view-count");
    			add_location(div30, file$6, 216, 28, 18872);
    			attr_dev(div31, "class", "col-12 mb-1 author-show-box pt-1");
    			add_location(div31, file$6, 211, 24, 18516);
    			attr_dev(article4, "class", "p-0  shadow-radius-section shadow-section mb-4 bg-light");
    			add_location(article4, file$6, 154, 20, 11606);
    			attr_dev(img12, "class", "cu-image-com mr-1 ");
    			if (img12.src !== (img12_src_value = "image/afarine.jpg")) attr_dev(img12, "src", img12_src_value);
    			attr_dev(img12, "alt", "");
    			add_location(img12, file$6, 225, 44, 19494);
    			attr_dev(div32, "class", "col-2 col-sm-1 col-md-1 col-lg-1 p-0 pt-1 custom-width");
    			add_location(div32, file$6, 224, 40, 19380);
    			set_style(i20, "color", "#048af7");
    			attr_dev(i20, "class", "fas fa-check-circle");
    			add_location(i20, file$6, 229, 125, 19973);
    			attr_dev(a20, "href", "magezine");
    			attr_dev(a20, "class", "title-post-link");
    			add_location(a20, file$6, 229, 52, 19900);
    			add_location(h62, file$6, 229, 48, 19896);
    			attr_dev(i21, "class", "fas fa-clock");
    			add_location(i21, file$6, 230, 80, 20121);
    			attr_dev(span13, "class", "show-time-custome");
    			add_location(span13, file$6, 230, 48, 20089);
    			attr_dev(div33, "class", "cu-intro mt-2");
    			add_location(div33, file$6, 228, 44, 19820);
    			attr_dev(div34, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-3 pr-md-4 pr-xl-3 mr-lg-0 mr-lg-1 mr-xl-0 justify-content-center custome-margin-right ");
    			add_location(div34, file$6, 227, 40, 19645);
    			attr_dev(div35, "class", "row ");
    			add_location(div35, file$6, 223, 36, 19321);
    			attr_dev(div36, "class", "col-11 col-md-11");
    			add_location(div36, file$6, 222, 32, 19253);
    			attr_dev(i22, "class", "fas fa-ellipsis-h -1 ");
    			attr_dev(i22, "type", "button");
    			attr_dev(i22, "data-toggle", "dropdown");
    			add_location(i22, file$6, 236, 36, 20507);
    			attr_dev(i23, "class", "far fa-bookmark");
    			add_location(i23, file$6, 238, 120, 20779);
    			attr_dev(a21, "class", "dropdown-item");
    			attr_dev(a21, "href", "#");
    			add_location(a21, file$6, 238, 85, 20744);
    			add_location(li6, file$6, 238, 40, 20699);
    			attr_dev(i24, "class", "fas fa-share-alt");
    			add_location(i24, file$6, 239, 78, 20914);
    			attr_dev(a22, "class", "dropdown-item");
    			attr_dev(a22, "href", "#");
    			add_location(a22, file$6, 239, 44, 20880);
    			add_location(li7, file$6, 239, 40, 20876);
    			attr_dev(i25, "class", "fas fa-flag");
    			add_location(i25, file$6, 240, 78, 21049);
    			attr_dev(a23, "class", "dropdown-item");
    			attr_dev(a23, "href", "#");
    			add_location(a23, file$6, 240, 44, 21015);
    			add_location(li8, file$6, 240, 40, 21011);
    			attr_dev(ul2, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul2, file$6, 237, 36, 20618);
    			attr_dev(div37, "class", "report navbar col-1 ml-0 pl-0 pr-3 pr-sm-4 pr-md-1 pr-lg-3 pr-xl-4 dropdown");
    			add_location(div37, file$6, 235, 32, 20381);
    			attr_dev(div38, "class", "row justify-content-between p-2 pl-4 pl-md-2 ");
    			add_location(div38, file$6, 221, 28, 19161);
    			attr_dev(div39, "class", "col-12");
    			add_location(div39, file$6, 220, 24, 19112);
    			attr_dev(a24, "class", "title-post-link");
    			attr_dev(a24, "href", "magezine/show-detail");
    			add_location(a24, file$6, 247, 72, 21390);
    			attr_dev(h32, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h32, file$6, 247, 28, 21346);
    			attr_dev(div40, "class", "col-12 p-0");
    			add_location(div40, file$6, 246, 24, 21293);
    			if (img13.src !== (img13_src_value = "image/30.jpg")) attr_dev(img13, "src", img13_src_value);
    			attr_dev(img13, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img13, "alt", "");
    			add_location(img13, file$6, 250, 28, 21618);
    			attr_dev(div41, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div41, file$6, 249, 24, 21532);
    			attr_dev(span14, "class", "content d-inline");
    			add_location(span14, file$6, 253, 32, 21836);
    			attr_dev(span15, "class", "read-more-custom");
    			attr_dev(span15, "onclick", "readMore(this)");
    			set_style(span15, "cursor", "pointer");
    			add_location(span15, file$6, 259, 32, 23446);
    			attr_dev(button2, "class", "btn btn-sm btn-danger col-12 my-1 p-1 offset-0 font-family");
    			add_location(button2, file$6, 263, 44, 23840);
    			attr_dev(a25, "href", "magezine/show-detail");
    			attr_dev(a25, "class", "col-3 col-md-2 px-0");
    			add_location(a25, file$6, 262, 40, 23736);
    			attr_dev(div42, "class", "row pl-0 ml-0 pt-2 justify-content-end ");
    			add_location(div42, file$6, 261, 36, 23642);
    			attr_dev(span16, "class", "read-more ");
    			add_location(span16, file$6, 260, 32, 23580);
    			attr_dev(p2, "class", "post-text col-12 mt-3 post-text");
    			add_location(p2, file$6, 252, 28, 21760);
    			attr_dev(img14, "class", "personal-img");
    			if (img14.src !== (img14_src_value = "image/1.jpeg")) attr_dev(img14, "src", img14_src_value);
    			attr_dev(img14, "alt", "");
    			add_location(img14, file$6, 272, 32, 24298);
    			attr_dev(span17, "class", "personal-name");
    			add_location(span17, file$6, 273, 32, 24383);
    			attr_dev(a26, "class", "a-clicked");
    			attr_dev(a26, "href", "profile");
    			add_location(a26, file$6, 271, 28, 24229);
    			attr_dev(i26, "class", "fas fa-eye");
    			add_location(i26, file$6, 275, 52, 24534);
    			attr_dev(div43, "class", "view-count");
    			add_location(div43, file$6, 275, 28, 24510);
    			attr_dev(div44, "class", "col-12 mb-1 author-show-box pt-1");
    			add_location(div44, file$6, 270, 24, 24154);
    			attr_dev(article5, "class", "p-0  shadow-radius-section shadow-section mb-4 bg-light");
    			add_location(article5, file$6, 219, 20, 19014);
    			attr_dev(div45, "class", "col-12 p-0 main-article");
    			add_location(div45, file$6, 88, 16, 4129);
    			attr_dev(section1, "class", "row mx-0 mt-3 mr-0 pt-0 bg-light ");
    			add_location(section1, file$6, 87, 12, 4061);
    			attr_dev(aside1, "class", "col-12 col-md-6 mx-2 order-first order-md-0 ");
    			add_location(aside1, file$6, 42, 8, 1264);
    			attr_dev(aside2, "class", "col-12 col-md-2 mx-1 mt-5 mt-md-0 bg-light shadow-radius-section");
    			add_location(aside2, file$6, 281, 8, 24703);
    			attr_dev(div46, "class", "row justify-content-center mx-lg-2");
    			add_location(div46, file$6, 40, 4, 1104);
    			attr_dev(main, "class", "container-fluid pin-parent ");
    			add_location(main, file$6, 39, 0, 1040);
    			add_location(br0, file$6, 286, 0, 24832);
    			attr_dev(hr, "class", "col-10 offset-1");
    			add_location(hr, file$6, 286, 4, 24836);
    			add_location(br1, file$6, 286, 32, 24864);
    			add_location(br2, file$6, 286, 36, 24868);
    			add_location(br3, file$6, 286, 40, 24872);
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
    					listen_dev(window_1$3, "scroll", () => {
    						scrolling = true;
    						clearTimeout(scrolling_timeout);
    						scrolling_timeout = setTimeout(clear_scrolling, 100);
    						/*onwindowscroll*/ ctx[5]();
    					}),
    					listen_dev(window_1$3, "resize", /*onwindowresize*/ ctx[6])
    				];

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
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Home", slots, []);
    	let { url = "" } = $$props;
    	let { id = 1 } = $$props;
    	let { y } = $$props;
    	let { x } = $$props;
    	let { h } = $$props;

    	/*export let post = [];
    	onMount(
    		async() => {
    			const res = await fetch('http://localhost:8000/post/page/1/')
    			post = await res.json()
    			post = post.data
    			
    		}
    	)*/
    	var currentLocation = window.location.href;

    	var splitUrl = currentLocation.split("/");
    	var lastSugment = splitUrl[splitUrl.length - 1];
    	const writable_props = ["url", "id", "y", "x", "h"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	function onwindowscroll() {
    		$$invalidate(0, y = window_1$3.pageYOffset);
    	}

    	function onwindowresize() {
    		$$invalidate(1, x = window_1$3.innerWidth);
    		$$invalidate(2, h = window_1$3.innerHeight);
    	}

    	$$self.$$set = $$props => {
    		if ("url" in $$props) $$invalidate(3, url = $$props.url);
    		if ("id" in $$props) $$invalidate(4, id = $$props.id);
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    		if ("x" in $$props) $$invalidate(1, x = $$props.x);
    		if ("h" in $$props) $$invalidate(2, h = $$props.h);
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
    		currentLocation,
    		splitUrl,
    		lastSugment
    	});

    	$$self.$inject_state = $$props => {
    		if ("url" in $$props) $$invalidate(3, url = $$props.url);
    		if ("id" in $$props) $$invalidate(4, id = $$props.id);
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    		if ("x" in $$props) $$invalidate(1, x = $$props.x);
    		if ("h" in $$props) $$invalidate(2, h = $$props.h);
    		if ("currentLocation" in $$props) currentLocation = $$props.currentLocation;
    		if ("splitUrl" in $$props) splitUrl = $$props.splitUrl;
    		if ("lastSugment" in $$props) lastSugment = $$props.lastSugment;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [y, x, h, url, id, onwindowscroll, onwindowresize];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { url: 3, id: 4, y: 0, x: 1, h: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$6.name
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
    }

    /* src/layout/Nav.svelte generated by Svelte v3.38.3 */

    const { window: window_1$2 } = globals;
    const file$5 = "src/layout/Nav.svelte";

    // (36:16) {#if x>175}
    function create_if_block$3(ctx) {
    	let div25;
    	let div24;
    	let div23;
    	let div22;
    	let div0;
    	let link0;
    	let t0;
    	let div1;
    	let link1;
    	let div1_class_value;
    	let t1;
    	let div2;
    	let link2;
    	let div2_class_value;
    	let t2;
    	let div3;
    	let link3;
    	let div3_class_value;
    	let t3;
    	let div6;
    	let div5;
    	let div4;
    	let i1;
    	let span0;
    	let br;
    	let i0;
    	let t4;
    	let div6_class_value;
    	let t5;
    	let t6;
    	let div21;
    	let div20;
    	let div7;
    	let img0;
    	let img0_src_value;
    	let t7;
    	let span1;
    	let i2;
    	let t8;
    	let t9;
    	let div19;
    	let div18;
    	let div14;
    	let div13;
    	let div11;
    	let div10;
    	let div8;
    	let img1;
    	let img1_src_value;
    	let t10;
    	let div9;
    	let h60;
    	let t12;
    	let p;
    	let t14;
    	let div12;
    	let button;
    	let t16;
    	let hr0;
    	let t17;
    	let div15;
    	let h61;
    	let t19;
    	let span2;
    	let a0;
    	let t21;
    	let span3;
    	let a1;
    	let t23;
    	let hr1;
    	let t24;
    	let div16;
    	let h62;
    	let t26;
    	let span4;
    	let a2;
    	let t28;
    	let hr2;
    	let t29;
    	let div17;
    	let span5;
    	let a3;
    	let div19_class_value;
    	let div22_class_value;
    	let current;

    	link0 = new Link({
    			props: {
    				to: "/",
    				class: "menu-item-link-color",
    				$$slots: { default: [create_default_slot_8] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	link1 = new Link({
    			props: {
    				to: "profile",
    				class: "menu-item-link-color",
    				$$slots: { default: [create_default_slot_7] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	link2 = new Link({
    			props: {
    				class: "menu-item-link-color",
    				to: "show-detail",
    				$$slots: { default: [create_default_slot_6] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	link3 = new Link({
    			props: {
    				class: "menu-item-link-color",
    				to: "magezine",
    				$$slots: { default: [create_default_slot_5] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	let if_block = /*x*/ ctx[1] < 320 && create_if_block_1$1(ctx);

    	const block = {
    		c: function create() {
    			div25 = element("div");
    			div24 = element("div");
    			div23 = element("div");
    			div22 = element("div");
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
    			span0 = element("span");
    			br = element("br");
    			i0 = element("i");
    			t4 = text(" ابزار");
    			t5 = space();
    			if (if_block) if_block.c();
    			t6 = space();
    			div21 = element("div");
    			div20 = element("div");
    			div7 = element("div");
    			img0 = element("img");
    			t7 = space();
    			span1 = element("span");
    			i2 = element("i");
    			t8 = text(" من");
    			t9 = space();
    			div19 = element("div");
    			div18 = element("div");
    			div14 = element("div");
    			div13 = element("div");
    			div11 = element("div");
    			div10 = element("div");
    			div8 = element("div");
    			img1 = element("img");
    			t10 = space();
    			div9 = element("div");
    			h60 = element("h6");
    			h60.textContent = "مسعودآقایی ساداتی";
    			t12 = space();
    			p = element("p");
    			p.textContent = "مدیر مسیول سایت اینولینکس و مدیرعامل شرکت آفرینه مدرس کارافرینی و MBA";
    			t14 = space();
    			div12 = element("div");
    			button = element("button");
    			button.textContent = "ناحیه کاربری";
    			t16 = space();
    			hr0 = element("hr");
    			t17 = space();
    			div15 = element("div");
    			h61 = element("h6");
    			h61.textContent = "حساب کاربری";
    			t19 = space();
    			span2 = element("span");
    			a0 = element("a");
    			a0.textContent = "کمک";
    			t21 = space();
    			span3 = element("span");
    			a1 = element("a");
    			a1.textContent = "تنظیمات و شخصی سازی";
    			t23 = space();
    			hr1 = element("hr");
    			t24 = space();
    			div16 = element("div");
    			h62 = element("h6");
    			h62.textContent = "مدیریت";
    			t26 = space();
    			span4 = element("span");
    			a2 = element("a");
    			a2.textContent = "مقالات و پست ها";
    			t28 = space();
    			hr2 = element("hr");
    			t29 = space();
    			div17 = element("div");
    			span5 = element("span");
    			a3 = element("a");
    			a3.textContent = "خروج";
    			attr_dev(div0, "class", "col-2 ");
    			add_location(div0, file$5, 40, 32, 1698);
    			attr_dev(div1, "class", div1_class_value = "col-2 px-md-0 " + (/*x*/ ctx[1] < 242 ? "d-none" : ""));
    			add_location(div1, file$5, 47, 32, 2248);
    			attr_dev(div2, "class", div2_class_value = "col-2  " + (/*x*/ ctx[1] < 260 ? "d-none" : ""));
    			add_location(div2, file$5, 54, 32, 2847);
    			attr_dev(div3, "class", div3_class_value = "col-2 " + (/*x*/ ctx[1] < 290 ? "d-none" : ""));
    			add_location(div3, file$5, 61, 32, 3443);
    			add_location(br, file$5, 71, 149, 4467);
    			attr_dev(i0, "class", "fas fa-sort-down");
    			add_location(i0, file$5, 71, 153, 4471);
    			attr_dev(span0, "class", "menu-item d-none d-md-inline");
    			add_location(span0, file$5, 71, 106, 4424);
    			attr_dev(i1, "class", "nav-logo fas fa-toolbox ml-1 p-0 m-0 mt-2 mt-md-0");
    			add_location(i1, file$5, 71, 44, 4362);
    			set_style(div4, "height", "25px");
    			attr_dev(div4, "class", "col-12 mt-2 text-center px-0 menu-icon pb-0 mb-0 dropdown");
    			add_location(div4, file$5, 70, 40, 4224);
    			attr_dev(div5, "class", "menu-item-link-color");
    			add_location(div5, file$5, 69, 36, 4149);
    			attr_dev(div6, "class", div6_class_value = "col-2 " + (/*x*/ ctx[1] < 320 ? "d-none" : ""));
    			attr_dev(div6, "data-toggle", "modal");
    			attr_dev(div6, "data-target", "#mod1");
    			add_location(div6, file$5, 68, 32, 4029);
    			attr_dev(img0, "class", "ml-0 p-0 m-0 margin-logo logo-cu-nav");
    			if (img0.src !== (img0_src_value = "image/1.jpeg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$5, 142, 44, 10453);
    			attr_dev(i2, "class", "fas fa-sort-down ");
    			add_location(i2, file$5, 143, 93, 10623);
    			attr_dev(span1, "class", "menu-item-logo d-none d-md-inline ");
    			add_location(span1, file$5, 143, 44, 10574);
    			attr_dev(div7, "data-toggle", "dropdown");
    			set_style(div7, "height", "25px");
    			attr_dev(div7, "class", "navbar col-12 mt-0 text-center px-0 menu-icon pb-0 mb-0 dropdown");
    			add_location(div7, file$5, 141, 40, 10285);
    			if (img1.src !== (img1_src_value = "image/1.jpeg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "mx-0 logo-cu-nav-tab");
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$5, 152, 68, 11371);
    			attr_dev(div8, "class", "col-3 pb-3 pl-0 w-auto");
    			add_location(div8, file$5, 151, 64, 11266);
    			attr_dev(h60, "class", "text-bold mb-0 pb-1");
    			add_location(h60, file$5, 155, 68, 11670);
    			attr_dev(p, "class", "pt-0 text-right direction font font-size-custom");
    			add_location(p, file$5, 158, 68, 11935);
    			attr_dev(div9, "class", "col-8 direction pr-1");
    			add_location(div9, file$5, 154, 64, 11567);
    			attr_dev(div10, "class", "row");
    			add_location(div10, file$5, 150, 60, 11184);
    			attr_dev(div11, "class", "col-12");
    			add_location(div11, file$5, 149, 56, 11103);
    			attr_dev(button, "class", "col-12 w-100 btn btn-sm btn-white border-primary border-custom-view-profile rounded-pill rounded-circle font text-center");
    			add_location(button, file$5, 165, 60, 12548);
    			attr_dev(div12, "class", "col-12");
    			add_location(div12, file$5, 164, 56, 12467);
    			attr_dev(div13, "class", "row");
    			add_location(div13, file$5, 148, 52, 11029);
    			attr_dev(div14, "class", "col-12");
    			add_location(div14, file$5, 147, 48, 10956);
    			attr_dev(hr0, "class", "dropdown-divider");
    			add_location(hr0, file$5, 169, 48, 12932);
    			attr_dev(h61, "class", "text-bold mb-0 pb-1");
    			add_location(h61, file$5, 171, 52, 13110);
    			attr_dev(a0, "href", "#");
    			attr_dev(a0, "class", "text-decoration-none font-tab-nav-account");
    			add_location(a0, file$5, 176, 56, 13508);
    			attr_dev(span2, "class", "d-block pb-1");
    			add_location(span2, file$5, 174, 52, 13322);
    			attr_dev(a1, "href", "#");
    			attr_dev(a1, "class", "text-decoration-none font-tab-nav-account");
    			add_location(a1, file$5, 180, 56, 13876);
    			attr_dev(span3, "class", "d-block pb-1");
    			add_location(span3, file$5, 178, 52, 13690);
    			attr_dev(div15, "class", "col-12 direction text-right font ");
    			add_location(div15, file$5, 170, 48, 13010);
    			attr_dev(hr1, "class", "dropdown-divider");
    			add_location(hr1, file$5, 183, 48, 14125);
    			attr_dev(h62, "class", "text-bold mb-0 pb-1");
    			add_location(h62, file$5, 185, 52, 14303);
    			attr_dev(a2, "href", "#");
    			attr_dev(a2, "class", "text-decoration-none font-tab-nav-account");
    			add_location(a2, file$5, 190, 56, 14696);
    			attr_dev(span4, "class", "d-block pb-1");
    			add_location(span4, file$5, 188, 52, 14510);
    			attr_dev(div16, "class", "col-12 direction text-right font ");
    			add_location(div16, file$5, 184, 48, 14203);
    			attr_dev(hr2, "class", "dropdown-divider");
    			add_location(hr2, file$5, 194, 48, 14994);
    			attr_dev(a3, "href", "#");
    			attr_dev(a3, "class", "text-decoration-none font-tab-nav-account");
    			add_location(a3, file$5, 198, 56, 15358);
    			attr_dev(span5, "class", "d-block pb-1");
    			add_location(span5, file$5, 196, 52, 15172);
    			attr_dev(div17, "class", "col-12 direction text-right font ");
    			add_location(div17, file$5, 195, 48, 15072);
    			attr_dev(div18, "class", "row px-2");
    			add_location(div18, file$5, 146, 44, 10885);
    			attr_dev(div19, "class", div19_class_value = "dropdown-menu logo-tab-menu " + (/*h*/ ctx[2] < 600 ? "menu-logo-dropdown-tab" : ""));
    			add_location(div19, file$5, 145, 40, 10759);
    			attr_dev(div20, "class", "menu-item-link-color ");
    			add_location(div20, file$5, 140, 36, 10209);
    			attr_dev(div21, "class", "col-2 ");
    			add_location(div21, file$5, 139, 32, 10152);

    			attr_dev(div22, "class", div22_class_value = "menu-main-element row " + (/*x*/ ctx[1] < 300
    			? "justify-content-center"
    			: "justify-content-start") + " " + (/*x*/ ctx[1] < 260
    			? "justify-content-between px-4"
    			: "justify-content-start") + " " + (/*x*/ ctx[1] < 242
    			? "justify-content-end"
    			: "justify-content-start") + "  mt-1");

    			set_style(div22, "direction", "rtl");
    			set_style(div22, "text-align", "center");
    			add_location(div22, file$5, 39, 28, 1395);
    			attr_dev(div23, "class", "col-12 ");
    			add_location(div23, file$5, 38, 24, 1345);
    			attr_dev(div24, "class", "row ");
    			add_location(div24, file$5, 37, 20, 1302);
    			attr_dev(div25, "class", "col-9 col-sm-7 col-custom pr-0 pl-2 ");
    			add_location(div25, file$5, 36, 16, 1231);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div25, anchor);
    			append_dev(div25, div24);
    			append_dev(div24, div23);
    			append_dev(div23, div22);
    			append_dev(div22, div0);
    			mount_component(link0, div0, null);
    			append_dev(div22, t0);
    			append_dev(div22, div1);
    			mount_component(link1, div1, null);
    			append_dev(div22, t1);
    			append_dev(div22, div2);
    			mount_component(link2, div2, null);
    			append_dev(div22, t2);
    			append_dev(div22, div3);
    			mount_component(link3, div3, null);
    			append_dev(div22, t3);
    			append_dev(div22, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, i1);
    			append_dev(i1, span0);
    			append_dev(span0, br);
    			append_dev(span0, i0);
    			append_dev(span0, t4);
    			append_dev(div22, t5);
    			if (if_block) if_block.m(div22, null);
    			append_dev(div22, t6);
    			append_dev(div22, div21);
    			append_dev(div21, div20);
    			append_dev(div20, div7);
    			append_dev(div7, img0);
    			append_dev(div7, t7);
    			append_dev(div7, span1);
    			append_dev(span1, i2);
    			append_dev(span1, t8);
    			append_dev(div20, t9);
    			append_dev(div20, div19);
    			append_dev(div19, div18);
    			append_dev(div18, div14);
    			append_dev(div14, div13);
    			append_dev(div13, div11);
    			append_dev(div11, div10);
    			append_dev(div10, div8);
    			append_dev(div8, img1);
    			append_dev(div10, t10);
    			append_dev(div10, div9);
    			append_dev(div9, h60);
    			append_dev(div9, t12);
    			append_dev(div9, p);
    			append_dev(div13, t14);
    			append_dev(div13, div12);
    			append_dev(div12, button);
    			append_dev(div18, t16);
    			append_dev(div18, hr0);
    			append_dev(div18, t17);
    			append_dev(div18, div15);
    			append_dev(div15, h61);
    			append_dev(div15, t19);
    			append_dev(div15, span2);
    			append_dev(span2, a0);
    			append_dev(div15, t21);
    			append_dev(div15, span3);
    			append_dev(span3, a1);
    			append_dev(div18, t23);
    			append_dev(div18, hr1);
    			append_dev(div18, t24);
    			append_dev(div18, div16);
    			append_dev(div16, h62);
    			append_dev(div16, t26);
    			append_dev(div16, span4);
    			append_dev(span4, a2);
    			append_dev(div18, t28);
    			append_dev(div18, hr2);
    			append_dev(div18, t29);
    			append_dev(div18, div17);
    			append_dev(div17, span5);
    			append_dev(span5, a3);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const link0_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				link0_changes.$$scope = { dirty, ctx };
    			}

    			link0.$set(link0_changes);
    			const link1_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				link1_changes.$$scope = { dirty, ctx };
    			}

    			link1.$set(link1_changes);

    			if (!current || dirty & /*x*/ 2 && div1_class_value !== (div1_class_value = "col-2 px-md-0 " + (/*x*/ ctx[1] < 242 ? "d-none" : ""))) {
    				attr_dev(div1, "class", div1_class_value);
    			}

    			const link2_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				link2_changes.$$scope = { dirty, ctx };
    			}

    			link2.$set(link2_changes);

    			if (!current || dirty & /*x*/ 2 && div2_class_value !== (div2_class_value = "col-2  " + (/*x*/ ctx[1] < 260 ? "d-none" : ""))) {
    				attr_dev(div2, "class", div2_class_value);
    			}

    			const link3_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				link3_changes.$$scope = { dirty, ctx };
    			}

    			link3.$set(link3_changes);

    			if (!current || dirty & /*x*/ 2 && div3_class_value !== (div3_class_value = "col-2 " + (/*x*/ ctx[1] < 290 ? "d-none" : ""))) {
    				attr_dev(div3, "class", div3_class_value);
    			}

    			if (!current || dirty & /*x*/ 2 && div6_class_value !== (div6_class_value = "col-2 " + (/*x*/ ctx[1] < 320 ? "d-none" : ""))) {
    				attr_dev(div6, "class", div6_class_value);
    			}

    			if (/*x*/ ctx[1] < 320) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*x*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_1$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div22, t6);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty & /*h*/ 4 && div19_class_value !== (div19_class_value = "dropdown-menu logo-tab-menu " + (/*h*/ ctx[2] < 600 ? "menu-logo-dropdown-tab" : ""))) {
    				attr_dev(div19, "class", div19_class_value);
    			}

    			if (!current || dirty & /*x*/ 2 && div22_class_value !== (div22_class_value = "menu-main-element row " + (/*x*/ ctx[1] < 300
    			? "justify-content-center"
    			: "justify-content-start") + " " + (/*x*/ ctx[1] < 260
    			? "justify-content-between px-4"
    			: "justify-content-start") + " " + (/*x*/ ctx[1] < 242
    			? "justify-content-end"
    			: "justify-content-start") + "  mt-1")) {
    				attr_dev(div22, "class", div22_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(link0.$$.fragment, local);
    			transition_in(link1.$$.fragment, local);
    			transition_in(link2.$$.fragment, local);
    			transition_in(link3.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(link0.$$.fragment, local);
    			transition_out(link1.$$.fragment, local);
    			transition_out(link2.$$.fragment, local);
    			transition_out(link3.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div25);
    			destroy_component(link0);
    			destroy_component(link1);
    			destroy_component(link2);
    			destroy_component(link3);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(36:16) {#if x>175}",
    		ctx
    	});

    	return block;
    }

    // (42:36) <Link to="/" class="menu-item-link-color">
    function create_default_slot_8(ctx) {
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
    			add_location(br, file$5, 43, 142, 2065);
    			attr_dev(span, "class", "menu-item d-none d-md-inline");
    			add_location(span, file$5, 43, 99, 2022);
    			attr_dev(i, "class", "nav-logo fas fa-home  p-0 m-0 mt-2 mt-md-0");
    			add_location(i, file$5, 43, 44, 1967);
    			set_style(div, "height", "25px");
    			attr_dev(div, "class", "col-12 mt-2 text-center px-0 menu-icon pb-0 mb-0");
    			add_location(div, file$5, 42, 40, 1838);
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
    		id: create_default_slot_8.name,
    		type: "slot",
    		source: "(42:36) <Link to=\\\"/\\\" class=\\\"menu-item-link-color\\\">",
    		ctx
    	});

    	return block;
    }

    // (49:36) <Link to="profile" class="menu-item-link-color">
    function create_default_slot_7(ctx) {
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
    			add_location(br, file$5, 50, 147, 2657);
    			attr_dev(span, "class", "menu-item d-none d-md-inline");
    			add_location(span, file$5, 50, 104, 2614);
    			attr_dev(i, "class", "nav-logo fas fa-mail-bulk p-0 m-0 mt-2 mt-md-0 ");
    			add_location(i, file$5, 50, 44, 2554);
    			set_style(div, "height", "25px");
    			attr_dev(div, "class", "col-12 mt-2 text-center px-0 menu-icon pb-0 mb-0");
    			add_location(div, file$5, 49, 40, 2425);
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
    		id: create_default_slot_7.name,
    		type: "slot",
    		source: "(49:36) <Link to=\\\"profile\\\" class=\\\"menu-item-link-color\\\">",
    		ctx
    	});

    	return block;
    }

    // (56:36) <Link class="menu-item-link-color" to="show-detail">
    function create_default_slot_6(ctx) {
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
    			add_location(br, file$5, 57, 153, 3259);
    			attr_dev(span, "class", "menu-item d-none d-md-inline");
    			add_location(span, file$5, 57, 110, 3216);
    			attr_dev(i, "class", "nav-logo fas fa-info-circle ml-1 p-0 m-0 mt-2 mt-md-0");
    			add_location(i, file$5, 57, 44, 3150);
    			set_style(div, "height", "25px");
    			attr_dev(div, "class", "col-12 mt-2 text-center px-0 menu-icon pb-0 mb-0");
    			add_location(div, file$5, 56, 40, 3021);
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
    		id: create_default_slot_6.name,
    		type: "slot",
    		source: "(56:36) <Link class=\\\"menu-item-link-color\\\" to=\\\"show-detail\\\">",
    		ctx
    	});

    	return block;
    }

    // (63:36) <Link class="menu-item-link-color" to="magezine">
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
    			t = text("مجله");
    			add_location(br, file$5, 64, 149, 3847);
    			attr_dev(span, "class", "menu-item d-none d-md-inline");
    			add_location(span, file$5, 64, 106, 3804);
    			attr_dev(i, "class", "nav-logo fas fa-feather ml-1 p-0 m-0 mt-2 mt-md-0");
    			add_location(i, file$5, 64, 44, 3742);
    			set_style(div, "height", "25px");
    			attr_dev(div, "class", "col-12 mt-2 text-center px-0 menu-icon pb-0 mb-0");
    			add_location(div, file$5, 63, 40, 3613);
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
    		source: "(63:36) <Link class=\\\"menu-item-link-color\\\" to=\\\"magezine\\\">",
    		ctx
    	});

    	return block;
    }

    // (100:32) {#if x<320}
    function create_if_block_1$1(ctx) {
    	let div0;
    	let i0;
    	let t0;
    	let div9;
    	let div8;
    	let div7;
    	let div1;
    	let link0;
    	let div1_class_value;
    	let t1;
    	let div2;
    	let link1;
    	let div2_class_value;
    	let t2;
    	let div3;
    	let link2;
    	let div3_class_value;
    	let t3;
    	let div6;
    	let div5;
    	let div4;
    	let i2;
    	let span;
    	let br;
    	let i1;
    	let t4;
    	let div6_class_value;
    	let current;

    	link0 = new Link({
    			props: {
    				to: "profile",
    				class: "menu-item-link-color row",
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	link1 = new Link({
    			props: {
    				class: "menu-item-link-color",
    				to: "show-detail",
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	link2 = new Link({
    			props: {
    				class: "menu-item-link-color",
    				to: "magezine",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			i0 = element("i");
    			t0 = space();
    			div9 = element("div");
    			div8 = element("div");
    			div7 = element("div");
    			div1 = element("div");
    			create_component(link0.$$.fragment);
    			t1 = space();
    			div2 = element("div");
    			create_component(link1.$$.fragment);
    			t2 = space();
    			div3 = element("div");
    			create_component(link2.$$.fragment);
    			t3 = space();
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			i2 = element("i");
    			span = element("span");
    			br = element("br");
    			i1 = element("i");
    			t4 = text(" ابزار");
    			attr_dev(i0, "class", "fas fa-ellipsis-h -1 ml-1 p-0 m-0 ");
    			add_location(i0, file$5, 101, 36, 6795);
    			attr_dev(div0, "data-toggle", "dropdown");
    			set_style(div0, "height", "25px");
    			attr_dev(div0, "class", "navbar col-2 mt-auto text-center pl-0 pr-3 menu-icon pb-0 mb-0 dropdown ");
    			add_location(div0, file$5, 100, 32, 6627);
    			attr_dev(div1, "class", div1_class_value = "col-3 " + (/*x*/ ctx[1] < 242 ? "d-inline " : "d-none"));
    			add_location(div1, file$5, 106, 44, 7177);
    			attr_dev(div2, "class", div2_class_value = "col-3  " + (/*x*/ ctx[1] < 260 ? "d-inline " : "d-none"));
    			add_location(div2, file$5, 113, 44, 7860);
    			attr_dev(div3, "class", div3_class_value = "col-3 " + (/*x*/ ctx[1] < 290 ? "d-inline " : "d-none"));
    			add_location(div3, file$5, 120, 44, 8544);
    			add_location(br, file$5, 130, 161, 9696);
    			attr_dev(i1, "class", "fas fa-sort-down");
    			add_location(i1, file$5, 130, 165, 9700);
    			attr_dev(span, "class", "menu-item d-none d-md-inline");
    			add_location(span, file$5, 130, 118, 9653);
    			attr_dev(i2, "class", "nav-logo fas fa-toolbox ml-1 p-0 m-0 mt-1 mt-md-0");
    			add_location(i2, file$5, 130, 56, 9591);
    			set_style(div4, "height", "25px");
    			attr_dev(div4, "class", "col-12 text-center px-0 menu-icon pb-0 mb-0 dropdown");
    			add_location(div4, file$5, 129, 52, 9446);
    			attr_dev(div5, "class", "menu-item-link-color");
    			add_location(div5, file$5, 128, 48, 9359);
    			attr_dev(div6, "class", div6_class_value = "col-3 " + (/*x*/ ctx[1] < 320 ? "d-inline " : "d-none"));
    			attr_dev(div6, "data-toggle", "modal");
    			attr_dev(div6, "data-target", "#mod1");
    			add_location(div6, file$5, 127, 44, 9218);
    			attr_dev(div7, "class", "row");
    			add_location(div7, file$5, 105, 40, 7115);
    			attr_dev(div8, "class", "col-12");
    			add_location(div8, file$5, 104, 36, 7054);
    			attr_dev(div9, "class", "row dropdown-menu tab-menu-icon direction mt-4 px-1 shadow text-center align-baseline");
    			add_location(div9, file$5, 103, 32, 6918);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, i0);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div9, anchor);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div1);
    			mount_component(link0, div1, null);
    			append_dev(div7, t1);
    			append_dev(div7, div2);
    			mount_component(link1, div2, null);
    			append_dev(div7, t2);
    			append_dev(div7, div3);
    			mount_component(link2, div3, null);
    			append_dev(div7, t3);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, i2);
    			append_dev(i2, span);
    			append_dev(span, br);
    			append_dev(span, i1);
    			append_dev(span, t4);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const link0_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				link0_changes.$$scope = { dirty, ctx };
    			}

    			link0.$set(link0_changes);

    			if (!current || dirty & /*x*/ 2 && div1_class_value !== (div1_class_value = "col-3 " + (/*x*/ ctx[1] < 242 ? "d-inline " : "d-none"))) {
    				attr_dev(div1, "class", div1_class_value);
    			}

    			const link1_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				link1_changes.$$scope = { dirty, ctx };
    			}

    			link1.$set(link1_changes);

    			if (!current || dirty & /*x*/ 2 && div2_class_value !== (div2_class_value = "col-3  " + (/*x*/ ctx[1] < 260 ? "d-inline " : "d-none"))) {
    				attr_dev(div2, "class", div2_class_value);
    			}

    			const link2_changes = {};

    			if (dirty & /*$$scope*/ 1024) {
    				link2_changes.$$scope = { dirty, ctx };
    			}

    			link2.$set(link2_changes);

    			if (!current || dirty & /*x*/ 2 && div3_class_value !== (div3_class_value = "col-3 " + (/*x*/ ctx[1] < 290 ? "d-inline " : "d-none"))) {
    				attr_dev(div3, "class", div3_class_value);
    			}

    			if (!current || dirty & /*x*/ 2 && div6_class_value !== (div6_class_value = "col-3 " + (/*x*/ ctx[1] < 320 ? "d-inline " : "d-none"))) {
    				attr_dev(div6, "class", div6_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(link0.$$.fragment, local);
    			transition_in(link1.$$.fragment, local);
    			transition_in(link2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(link0.$$.fragment, local);
    			transition_out(link1.$$.fragment, local);
    			transition_out(link2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div9);
    			destroy_component(link0);
    			destroy_component(link1);
    			destroy_component(link2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(100:32) {#if x<320}",
    		ctx
    	});

    	return block;
    }

    // (108:48) <Link to="profile" class="menu-item-link-color row">
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
    			add_location(br, file$5, 109, 159, 7622);
    			attr_dev(span, "class", "menu-item d-none d-md-inline");
    			add_location(span, file$5, 109, 116, 7579);
    			attr_dev(i, "class", "nav-logo fas fa-mail-bulk p-0 m-0 mt-1 mt-md-0 ");
    			add_location(i, file$5, 109, 56, 7519);
    			set_style(div, "height", "25px");
    			attr_dev(div, "class", "col-12 text-center px-0 menu-icon pb-0 mb-0");
    			add_location(div, file$5, 108, 52, 7383);
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
    		source: "(108:48) <Link to=\\\"profile\\\" class=\\\"menu-item-link-color row\\\">",
    		ctx
    	});

    	return block;
    }

    // (115:48) <Link class="menu-item-link-color" to="show-detail">
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
    			add_location(br, file$5, 116, 165, 8312);
    			attr_dev(span, "class", "menu-item d-none d-md-inline");
    			add_location(span, file$5, 116, 122, 8269);
    			attr_dev(i, "class", "nav-logo fas fa-info-circle ml-1 p-0 m-0 mt-1 mt-md-0");
    			add_location(i, file$5, 116, 56, 8203);
    			set_style(div, "height", "25px");
    			attr_dev(div, "class", "col-12 text-center px-0 menu-icon pb-0 mb-0");
    			add_location(div, file$5, 115, 52, 8067);
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
    		source: "(115:48) <Link class=\\\"menu-item-link-color\\\" to=\\\"show-detail\\\">",
    		ctx
    	});

    	return block;
    }

    // (122:48) <Link class="menu-item-link-color" to="magezine">
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
    			add_location(br, file$5, 123, 161, 8988);
    			attr_dev(span, "class", "menu-item d-none d-md-inline");
    			add_location(span, file$5, 123, 118, 8945);
    			attr_dev(i, "class", "nav-logo fas fa-feather ml-1 p-0 m-0 mt-1 mt-md-0");
    			add_location(i, file$5, 123, 56, 8883);
    			set_style(div, "height", "25px");
    			attr_dev(div, "class", "col-12 text-center px-0 menu-icon pb-0 mb-0");
    			add_location(div, file$5, 122, 52, 8747);
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
    		source: "(122:48) <Link class=\\\"menu-item-link-color\\\" to=\\\"magezine\\\">",
    		ctx
    	});

    	return block;
    }

    // (212:20) <Link class="row direction text-decoration-none justify-content-between" to="/">
    function create_default_slot_1(ctx) {
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div2;
    	let div1;
    	let span;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div2 = element("div");
    			div1 = element("div");
    			span = element("span");
    			span.textContent = "اینولینکس";
    			if (img.src !== (img_src_value = /*src*/ ctx[3])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "brand-icon mt-2");
    			attr_dev(img, "alt", "");
    			add_location(img, file$5, 213, 28, 16127);
    			attr_dev(div0, "class", "col-1 h-100 ");
    			add_location(div0, file$5, 212, 24, 16072);
    			attr_dev(span, "class", "brand-icon-custome px-3");
    			add_location(span, file$5, 217, 32, 16364);
    			attr_dev(div1, "class", "brand-text");
    			add_location(div1, file$5, 216, 28, 16307);
    			attr_dev(div2, "class", "col-8 pr-2 direction d-none d-lg-inline");
    			add_location(div2, file$5, 215, 24, 16225);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, img);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, span);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*src*/ 8 && img.src !== (img_src_value = /*src*/ ctx[3])) {
    				attr_dev(img, "src", img_src_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(212:20) <Link class=\\\"row direction text-decoration-none justify-content-between\\\" to=\\\"/\\\">",
    		ctx
    	});

    	return block;
    }

    // (31:0) <Router url="{url}">
    function create_default_slot(ctx) {
    	let header;
    	let nav;
    	let div1;
    	let t0;
    	let div0;
    	let link;
    	let t1;
    	let div2;
    	let route0;
    	let t2;
    	let route1;
    	let t3;
    	let route2;
    	let t4;
    	let route3;
    	let t5;
    	let route4;
    	let t6;
    	let route5;
    	let t7;
    	let route6;
    	let t8;
    	let route7;
    	let current;
    	let if_block = /*x*/ ctx[1] > 175 && create_if_block$3(ctx);

    	link = new Link({
    			props: {
    				class: "row direction text-decoration-none justify-content-between",
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
    			div1 = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			div0 = element("div");
    			create_component(link.$$.fragment);
    			t1 = space();
    			div2 = element("div");
    			create_component(route0.$$.fragment);
    			t2 = space();
    			create_component(route1.$$.fragment);
    			t3 = space();
    			create_component(route2.$$.fragment);
    			t4 = space();
    			create_component(route3.$$.fragment);
    			t5 = space();
    			create_component(route4.$$.fragment);
    			t6 = space();
    			create_component(route5.$$.fragment);
    			t7 = space();
    			create_component(route6.$$.fragment);
    			t8 = space();
    			create_component(route7.$$.fragment);
    			attr_dev(div0, "class", "col-2 col-md-1 col-lg-2 col-xl-1 ml-1 ml-md-3 ml-lg-5 ");
    			add_location(div0, file$5, 210, 16, 15878);
    			attr_dev(div1, "class", "row justify-content-end px-0 px-md-2 px-lg-5 ");
    			add_location(div1, file$5, 34, 12, 1126);
    			attr_dev(nav, "class", "container-fluid pb-0 ");
    			add_location(nav, file$5, 33, 8, 1076);
    			attr_dev(header, "class", "sticky-top ");
    			toggle_class(header, "nav-custome-bottom", /*y*/ ctx[0] <= 768);
    			add_location(header, file$5, 32, 4, 1004);
    			add_location(div2, file$5, 227, 4, 16635);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, nav);
    			append_dev(nav, div1);
    			if (if_block) if_block.m(div1, null);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			mount_component(link, div0, null);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div2, anchor);
    			mount_component(route0, div2, null);
    			append_dev(div2, t2);
    			mount_component(route1, div2, null);
    			append_dev(div2, t3);
    			mount_component(route2, div2, null);
    			append_dev(div2, t4);
    			mount_component(route3, div2, null);
    			append_dev(div2, t5);
    			mount_component(route4, div2, null);
    			append_dev(div2, t6);
    			mount_component(route5, div2, null);
    			append_dev(div2, t7);
    			mount_component(route6, div2, null);
    			append_dev(div2, t8);
    			mount_component(route7, div2, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*x*/ ctx[1] > 175) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*x*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div1, t0);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}

    			const link_changes = {};

    			if (dirty & /*$$scope, src*/ 1032) {
    				link_changes.$$scope = { dirty, ctx };
    			}

    			link.$set(link_changes);

    			if (dirty & /*y*/ 1) {
    				toggle_class(header, "nav-custome-bottom", /*y*/ ctx[0] <= 768);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(link.$$.fragment, local);
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
    			transition_out(if_block);
    			transition_out(link.$$.fragment, local);
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
    			if (if_block) if_block.d();
    			destroy_component(link);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div2);
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
    		source: "(31:0) <Router url=\\\"{url}\\\">",
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
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowscroll*/ ctx[8]);
    	add_render_callback(/*onwindowresize*/ ctx[9]);

    	router = new Router({
    			props: {
    				url: /*url*/ ctx[4],
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
    			add_location(div0, file$5, 242, 20, 17378);
    			attr_dev(div1, "class", "modal-body");
    			add_location(div1, file$5, 241, 16, 17333);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-secondary");
    			attr_dev(button, "data-dismiss", "modal");
    			add_location(button, file$5, 247, 20, 17590);
    			attr_dev(div2, "class", "modal-footer");
    			add_location(div2, file$5, 246, 16, 17543);
    			attr_dev(div3, "class", "modal-content");
    			add_location(div3, file$5, 240, 12, 17289);
    			attr_dev(div4, "class", "modal-dialog");
    			attr_dev(div4, "role", "document");
    			add_location(div4, file$5, 239, 8, 17234);
    			attr_dev(div5, "class", "nav-modal modal left fade");
    			attr_dev(div5, "id", "mod1");
    			attr_dev(div5, "tabindex", "");
    			attr_dev(div5, "role", "dialog");
    			attr_dev(div5, "aria-hidden", "true");
    			add_location(div5, file$5, 238, 4, 17131);
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

    			if (!mounted) {
    				dispose = [
    					listen_dev(window_1$2, "scroll", () => {
    						scrolling = true;
    						clearTimeout(scrolling_timeout);
    						scrolling_timeout = setTimeout(clear_scrolling, 100);
    						/*onwindowscroll*/ ctx[8]();
    					}),
    					listen_dev(window_1$2, "resize", /*onwindowresize*/ ctx[9])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*y*/ 1 && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window_1$2.pageXOffset, /*y*/ ctx[0]);
    				scrolling_timeout = setTimeout(clear_scrolling, 100);
    			}

    			const router_changes = {};
    			if (dirty & /*url*/ 16) router_changes.url = /*url*/ ctx[4];

    			if (dirty & /*$$scope, y, src, x, h*/ 1039) {
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
    	validate_slots("Nav", slots, []);
    	let { url = "" } = $$props;
    	let { y } = $$props;
    	let { x } = $$props;
    	let { h } = $$props;
    	let { currentLocation = window.location.href } = $$props;
    	let { splitUrl = currentLocation.split("/") } = $$props;
    	let { lastSugment = splitUrl[splitUrl.length - 1] } = $$props;
    	let { src } = $$props;

    	if (lastSugment === "show-detail") {
    		src = "../image/1.png";
    	} else {
    		src = "image/1.png";
    	}

    	const writable_props = ["url", "y", "x", "h", "currentLocation", "splitUrl", "lastSugment", "src"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Nav> was created with unknown prop '${key}'`);
    	});

    	function onwindowscroll() {
    		$$invalidate(0, y = window_1$2.pageYOffset);
    	}

    	function onwindowresize() {
    		$$invalidate(1, x = window_1$2.innerWidth);
    		$$invalidate(2, h = window_1$2.innerHeight);
    	}

    	$$self.$$set = $$props => {
    		if ("url" in $$props) $$invalidate(4, url = $$props.url);
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    		if ("x" in $$props) $$invalidate(1, x = $$props.x);
    		if ("h" in $$props) $$invalidate(2, h = $$props.h);
    		if ("currentLocation" in $$props) $$invalidate(5, currentLocation = $$props.currentLocation);
    		if ("splitUrl" in $$props) $$invalidate(6, splitUrl = $$props.splitUrl);
    		if ("lastSugment" in $$props) $$invalidate(7, lastSugment = $$props.lastSugment);
    		if ("src" in $$props) $$invalidate(3, src = $$props.src);
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
    		x,
    		h,
    		currentLocation,
    		splitUrl,
    		lastSugment,
    		src
    	});

    	$$self.$inject_state = $$props => {
    		if ("url" in $$props) $$invalidate(4, url = $$props.url);
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    		if ("x" in $$props) $$invalidate(1, x = $$props.x);
    		if ("h" in $$props) $$invalidate(2, h = $$props.h);
    		if ("currentLocation" in $$props) $$invalidate(5, currentLocation = $$props.currentLocation);
    		if ("splitUrl" in $$props) $$invalidate(6, splitUrl = $$props.splitUrl);
    		if ("lastSugment" in $$props) $$invalidate(7, lastSugment = $$props.lastSugment);
    		if ("src" in $$props) $$invalidate(3, src = $$props.src);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		y,
    		x,
    		h,
    		src,
    		url,
    		currentLocation,
    		splitUrl,
    		lastSugment,
    		onwindowscroll,
    		onwindowresize
    	];
    }

    class Nav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {
    			url: 4,
    			y: 0,
    			x: 1,
    			h: 2,
    			currentLocation: 5,
    			splitUrl: 6,
    			lastSugment: 7,
    			src: 3
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Nav",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*y*/ ctx[0] === undefined && !("y" in props)) {
    			console.warn("<Nav> was created without expected prop 'y'");
    		}

    		if (/*x*/ ctx[1] === undefined && !("x" in props)) {
    			console.warn("<Nav> was created without expected prop 'x'");
    		}

    		if (/*h*/ ctx[2] === undefined && !("h" in props)) {
    			console.warn("<Nav> was created without expected prop 'h'");
    		}

    		if (/*src*/ ctx[3] === undefined && !("src" in props)) {
    			console.warn("<Nav> was created without expected prop 'src'");
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

    	get x() {
    		throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set x(value) {
    		throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get h() {
    		throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set h(value) {
    		throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get currentLocation() {
    		throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentLocation(value) {
    		throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get splitUrl() {
    		throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set splitUrl(value) {
    		throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get lastSugment() {
    		throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lastSugment(value) {
    		throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get src() {
    		throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set src(value) {
    		throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/layout/Footer.svelte generated by Svelte v3.38.3 */

    const { window: window_1$1 } = globals;
    const file$4 = "src/layout/Footer.svelte";

    function create_fragment$4(ctx) {
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
    	let div6;
    	let ul2;
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
    	let div11;
    	let p;
    	let t32;
    	let a12;
    	let t34;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowscroll*/ ctx[5]);

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
    			div6 = element("div");
    			ul2 = element("ul");
    			li8 = element("li");
    			a8 = element("a");
    			a8.textContent = "اعضای تیم مرکزی";
    			t25 = space();
    			li9 = element("li");
    			a9 = element("a");
    			a9.textContent = "طرح سوال از مخاطب";
    			t27 = space();
    			li10 = element("li");
    			a10 = element("a");
    			a10.textContent = "پشتیبانی سایت";
    			t29 = space();
    			li11 = element("li");
    			a11 = element("a");
    			a11.textContent = "داده های ثبت احوال";
    			t31 = space();
    			div11 = element("div");
    			p = element("p");
    			t32 = text("© تمام حقوق برای ");
    			a12 = element("a");
    			a12.textContent = "inolinX.com";
    			t34 = text(" محفوظ است.");
    			if (img.src !== (img_src_value = /*src*/ ctx[1])) attr_dev(img, "src", img_src_value);
    			add_location(img, file$4, 23, 16, 590);
    			add_location(span0, file$4, 24, 12, 614);
    			add_location(span1, file$4, 24, 29, 631);
    			add_location(h50, file$4, 23, 12, 586);
    			attr_dev(div0, "class", "icon_footer");
    			add_location(div0, file$4, 21, 8, 490);
    			attr_dev(input, "type", "email");
    			attr_dev(input, "class", "form-control");
    			attr_dev(input, "id", "exampleInputEmail1");
    			attr_dev(input, "placeholder", "لطفا ایمیل خود را وارد کنید");
    			add_location(input, file$4, 32, 24, 874);
    			attr_dev(fieldset0, "class", "form-group");
    			add_location(fieldset0, file$4, 31, 20, 820);
    			attr_dev(textarea, "class", "form-control");
    			attr_dev(textarea, "id", "exampleMessage");
    			attr_dev(textarea, "placeholder", "متن");
    			add_location(textarea, file$4, 35, 24, 1088);
    			attr_dev(fieldset1, "class", "form-group");
    			add_location(fieldset1, file$4, 34, 20, 1034);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn");
    			add_location(button, file$4, 38, 24, 1289);
    			attr_dev(fieldset2, "class", "form-group text-xs-right");
    			add_location(fieldset2, file$4, 37, 20, 1221);
    			set_style(form, "direction", "rtl");
    			add_location(form, file$4, 30, 16, 769);
    			attr_dev(div1, "class", "col-md-4");
    			add_location(div1, file$4, 29, 12, 730);
    			attr_dev(h51, "class", "text-center mx-auto");
    			add_location(h51, file$4, 44, 20, 1558);
    			attr_dev(div2, "class", "col-12");
    			add_location(div2, file$4, 43, 16, 1517);
    			add_location(hr, file$4, 46, 16, 1671);
    			attr_dev(i0, "class", "fab fa-github fa-lg");
    			add_location(i0, file$4, 49, 73, 1847);
    			attr_dev(a0, "href", "");
    			attr_dev(a0, "class", "nav-link");
    			add_location(a0, file$4, 49, 45, 1819);
    			attr_dev(li0, "class", "nav-item");
    			add_location(li0, file$4, 49, 24, 1798);
    			attr_dev(i1, "class", "fab fa-twitter fa-lg");
    			add_location(i1, file$4, 50, 73, 1965);
    			attr_dev(a1, "href", "");
    			attr_dev(a1, "class", "nav-link");
    			add_location(a1, file$4, 50, 45, 1937);
    			attr_dev(li1, "class", "nav-item");
    			add_location(li1, file$4, 50, 24, 1916);
    			attr_dev(i2, "class", "fas fa-check-circle fa-lg");
    			add_location(i2, file$4, 51, 73, 2084);
    			attr_dev(a2, "href", "");
    			attr_dev(a2, "class", "nav-link");
    			add_location(a2, file$4, 51, 45, 2056);
    			attr_dev(li2, "class", "nav-item");
    			add_location(li2, file$4, 51, 24, 2035);
    			attr_dev(i3, "class", "fab fa-instagram fa-lg");
    			add_location(i3, file$4, 52, 73, 2208);
    			attr_dev(a3, "href", "");
    			attr_dev(a3, "class", "nav-link");
    			add_location(a3, file$4, 52, 45, 2180);
    			attr_dev(li3, "class", "nav-item");
    			add_location(li3, file$4, 52, 24, 2159);
    			attr_dev(ul0, "class", "nav justify-content-center");
    			add_location(ul0, file$4, 48, 20, 1733);
    			add_location(br, file$4, 54, 20, 2302);
    			attr_dev(div3, "class", "col-12");
    			add_location(div3, file$4, 47, 16, 1692);
    			attr_dev(div4, "class", "col-md-4 order-md-first social_media");
    			set_style(div4, "direction", "rtl");
    			add_location(div4, file$4, 42, 12, 1426);
    			attr_dev(a4, "href", "");
    			add_location(a4, file$4, 61, 32, 2591);
    			add_location(li4, file$4, 61, 28, 2587);
    			attr_dev(a5, "href", "");
    			add_location(a5, file$4, 62, 32, 2664);
    			add_location(li5, file$4, 62, 28, 2660);
    			attr_dev(a6, "href", "");
    			add_location(a6, file$4, 63, 32, 2729);
    			add_location(li6, file$4, 63, 28, 2725);
    			attr_dev(a7, "href", "");
    			add_location(a7, file$4, 64, 32, 2801);
    			add_location(li7, file$4, 64, 28, 2797);
    			attr_dev(ul1, "class", "list-unstyled");
    			add_location(ul1, file$4, 60, 24, 2532);
    			attr_dev(div5, "class", "col-6");
    			add_location(div5, file$4, 59, 20, 2488);
    			attr_dev(a8, "href", "");
    			add_location(a8, file$4, 71, 32, 3080);
    			add_location(li8, file$4, 71, 28, 3076);
    			attr_dev(a9, "href", "");
    			add_location(a9, file$4, 72, 32, 3148);
    			add_location(li9, file$4, 72, 28, 3144);
    			attr_dev(a10, "href", "");
    			add_location(a10, file$4, 73, 32, 3218);
    			add_location(li10, file$4, 73, 28, 3214);
    			attr_dev(a11, "href", "");
    			add_location(a11, file$4, 74, 32, 3284);
    			add_location(li11, file$4, 74, 28, 3280);
    			attr_dev(ul2, "class", "list-unstyled");
    			add_location(ul2, file$4, 70, 24, 3021);
    			attr_dev(div6, "class", "col-6");
    			add_location(div6, file$4, 69, 20, 2977);
    			attr_dev(div7, "class", "row");
    			add_location(div7, file$4, 58, 16, 2450);
    			attr_dev(div8, "class", "col-md-4 order-first order-md-last");
    			set_style(div8, "direction", "rtl");
    			add_location(div8, file$4, 57, 12, 2361);
    			attr_dev(div9, "class", "row");
    			add_location(div9, file$4, 27, 8, 687);
    			attr_dev(div10, "class", "container");
    			add_location(div10, file$4, 20, 4, 458);
    			attr_dev(a12, "target", "blank");
    			attr_dev(a12, "href", "http://www.inolinx.com");
    			add_location(a12, file$4, 84, 28, 3516);
    			add_location(p, file$4, 84, 8, 3496);
    			attr_dev(div11, "class", "copyright container");
    			add_location(div11, file$4, 83, 4, 3454);
    			attr_dev(footer, "class", "footer");
    			add_location(footer, file$4, 19, 0, 430);
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
    			append_dev(div7, t23);
    			append_dev(div7, div6);
    			append_dev(div6, ul2);
    			append_dev(ul2, li8);
    			append_dev(li8, a8);
    			append_dev(ul2, t25);
    			append_dev(ul2, li9);
    			append_dev(li9, a9);
    			append_dev(ul2, t27);
    			append_dev(ul2, li10);
    			append_dev(li10, a10);
    			append_dev(ul2, t29);
    			append_dev(ul2, li11);
    			append_dev(li11, a11);
    			append_dev(footer, t31);
    			append_dev(footer, div11);
    			append_dev(div11, p);
    			append_dev(p, t32);
    			append_dev(p, a12);
    			append_dev(p, t34);

    			if (!mounted) {
    				dispose = listen_dev(window_1$1, "scroll", () => {
    					scrolling = true;
    					clearTimeout(scrolling_timeout);
    					scrolling_timeout = setTimeout(clear_scrolling, 100);
    					/*onwindowscroll*/ ctx[5]();
    				});

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*y*/ 1 && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window_1$1.pageXOffset, /*y*/ ctx[0]);
    				scrolling_timeout = setTimeout(clear_scrolling, 100);
    			}

    			if (dirty & /*src*/ 2 && img.src !== (img_src_value = /*src*/ ctx[1])) {
    				attr_dev(img, "src", img_src_value);
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
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Footer", slots, []);
    	let { y } = $$props;
    	let { currentLocation = window.location.href } = $$props;
    	let { splitUrl = currentLocation.split("/") } = $$props;
    	let { lastSugment = splitUrl[splitUrl.length - 1] } = $$props;
    	let { src } = $$props;

    	if (lastSugment === "show-detail") {
    		src = "../image/1.png";
    	} else {
    		src = "image/1.png";
    	}

    	const writable_props = ["y", "currentLocation", "splitUrl", "lastSugment", "src"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Footer> was created with unknown prop '${key}'`);
    	});

    	function onwindowscroll() {
    		$$invalidate(0, y = window_1$1.pageYOffset);
    	}

    	$$self.$$set = $$props => {
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    		if ("currentLocation" in $$props) $$invalidate(2, currentLocation = $$props.currentLocation);
    		if ("splitUrl" in $$props) $$invalidate(3, splitUrl = $$props.splitUrl);
    		if ("lastSugment" in $$props) $$invalidate(4, lastSugment = $$props.lastSugment);
    		if ("src" in $$props) $$invalidate(1, src = $$props.src);
    	};

    	$$self.$capture_state = () => ({
    		y,
    		currentLocation,
    		splitUrl,
    		lastSugment,
    		src
    	});

    	$$self.$inject_state = $$props => {
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    		if ("currentLocation" in $$props) $$invalidate(2, currentLocation = $$props.currentLocation);
    		if ("splitUrl" in $$props) $$invalidate(3, splitUrl = $$props.splitUrl);
    		if ("lastSugment" in $$props) $$invalidate(4, lastSugment = $$props.lastSugment);
    		if ("src" in $$props) $$invalidate(1, src = $$props.src);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [y, src, currentLocation, splitUrl, lastSugment, onwindowscroll];
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			y: 0,
    			currentLocation: 2,
    			splitUrl: 3,
    			lastSugment: 4,
    			src: 1
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*y*/ ctx[0] === undefined && !("y" in props)) {
    			console.warn("<Footer> was created without expected prop 'y'");
    		}

    		if (/*src*/ ctx[1] === undefined && !("src" in props)) {
    			console.warn("<Footer> was created without expected prop 'src'");
    		}
    	}

    	get y() {
    		throw new Error("<Footer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<Footer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get currentLocation() {
    		throw new Error("<Footer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentLocation(value) {
    		throw new Error("<Footer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get splitUrl() {
    		throw new Error("<Footer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set splitUrl(value) {
    		throw new Error("<Footer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get lastSugment() {
    		throw new Error("<Footer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lastSugment(value) {
    		throw new Error("<Footer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get src() {
    		throw new Error("<Footer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set src(value) {
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
    const file$3 = "node_modules/svelte-loading-spinners/dist/Wave.svelte";

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
    			add_location(div, file$3, 48, 4, 1193);
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

    function create_fragment$3(ctx) {
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
    			add_location(div, file$3, 44, 0, 1053);
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
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { color: 0, unit: 1, duration: 2, size: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Wave",
    			options,
    			id: create_fragment$3.name
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

    /* src/pages/Log_Sign/login.svelte generated by Svelte v3.38.3 */

    const { setTimeout: setTimeout_1$2 } = globals;
    const file$2 = "src/pages/Log_Sign/login.svelte";

    // (20:0) {#if loading===true}
    function create_if_block$2(ctx) {
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
    			add_location(span, file$2, 21, 66, 546);
    			set_style(div, "direction", "rtl");
    			set_style(div, "text-align", "center");
    			set_style(div, "margin", "auto");
    			set_style(div, "width", "100%");
    			set_style(div, "height", "100%");
    			add_location(div, file$2, 20, 1, 394);
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
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(20:0) {#if loading===true}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let scrolling = false;

    	let clear_scrolling = () => {
    		scrolling = false;
    	};

    	let scrolling_timeout;
    	let t0;
    	let main;
    	let div10;
    	let div9;
    	let div8;
    	let div2;
    	let div1;
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let h4;
    	let t3;
    	let div7;
    	let div4;
    	let div3;
    	let h3;
    	let t5;
    	let p0;
    	let t7;
    	let form;
    	let div5;
    	let label0;
    	let t9;
    	let input0;
    	let t10;
    	let div6;
    	let label1;
    	let t12;
    	let input1;
    	let t13;
    	let p1;
    	let a0;
    	let t15;
    	let button;
    	let t17;
    	let p2;
    	let t18;
    	let a1;
    	let main_transition;
    	let t20;
    	let div25;
    	let div24;
    	let div13;
    	let div12;
    	let div11;
    	let img1;
    	let img1_src_value;
    	let t21;
    	let h6;
    	let t23;
    	let div23;
    	let div22;
    	let div14;
    	let t25;
    	let div15;
    	let a2;
    	let t27;
    	let div16;
    	let a3;
    	let t29;
    	let div17;
    	let a4;
    	let t31;
    	let div18;
    	let a5;
    	let t33;
    	let div19;
    	let a6;
    	let t35;
    	let div20;
    	let a7;
    	let t37;
    	let div21;
    	let a8;
    	let current;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowscroll*/ ctx[4]);
    	add_render_callback(/*onwindowresize*/ ctx[5]);
    	let if_block = /*loading*/ ctx[3] === true && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t0 = space();
    			main = element("main");
    			div10 = element("div");
    			div9 = element("div");
    			div8 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			img0 = element("img");
    			t1 = space();
    			h4 = element("h4");
    			h4.textContent = "اینولینکس";
    			t3 = space();
    			div7 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			h3 = element("h3");
    			h3.textContent = "ورود";
    			t5 = space();
    			p0 = element("p");
    			p0.textContent = "از دنیای حرفه ای خود مطلع شوید";
    			t7 = space();
    			form = element("form");
    			div5 = element("div");
    			label0 = element("label");
    			label0.textContent = "ایمیل";
    			t9 = space();
    			input0 = element("input");
    			t10 = space();
    			div6 = element("div");
    			label1 = element("label");
    			label1.textContent = "رمزعبور";
    			t12 = space();
    			input1 = element("input");
    			t13 = space();
    			p1 = element("p");
    			a0 = element("a");
    			a0.textContent = "رمز عبور خود را فراموش کرده اید؟";
    			t15 = space();
    			button = element("button");
    			button.textContent = "وارد شوید";
    			t17 = space();
    			p2 = element("p");
    			t18 = text("هنوز ثبت نام نکرده اید؟ ");
    			a1 = element("a");
    			a1.textContent = "تبت نام کنید";
    			t20 = space();
    			div25 = element("div");
    			div24 = element("div");
    			div13 = element("div");
    			div12 = element("div");
    			div11 = element("div");
    			img1 = element("img");
    			t21 = space();
    			h6 = element("h6");
    			h6.textContent = "اینولینکس";
    			t23 = space();
    			div23 = element("div");
    			div22 = element("div");
    			div14 = element("div");
    			div14.textContent = "© ۲۰۲۱";
    			t25 = space();
    			div15 = element("div");
    			a2 = element("a");
    			a2.textContent = "درباره ما";
    			t27 = space();
    			div16 = element("div");
    			a3 = element("a");
    			a3.textContent = "تماس با ما";
    			t29 = space();
    			div17 = element("div");
    			a4 = element("a");
    			a4.textContent = "خانه";
    			t31 = space();
    			div18 = element("div");
    			a5 = element("a");
    			a5.textContent = "پروفایل";
    			t33 = space();
    			div19 = element("div");
    			a6 = element("a");
    			a6.textContent = "مجله";
    			t35 = space();
    			div20 = element("div");
    			a7 = element("a");
    			a7.textContent = "تبت نام";
    			t37 = space();
    			div21 = element("div");
    			a8 = element("a");
    			a8.textContent = "ورود";
    			if (img0.src !== (img0_src_value = "image/1.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "class", "logo-image-signup");
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$2, 33, 28, 1132);
    			attr_dev(h4, "class", "d-inline webName-signup ");
    			add_location(h4, file$2, 34, 28, 1217);
    			attr_dev(div0, "class", "col-12 pt-2 pt-md-0");
    			add_location(div0, file$2, 32, 24, 1070);
    			attr_dev(div1, "class", "row justify-content-start text-right ");
    			add_location(div1, file$2, 31, 20, 994);
    			attr_dev(div2, "class", "col-12 col-md-9 mb-5");
    			add_location(div2, file$2, 30, 16, 939);
    			attr_dev(h3, "class", "col-12 text-bold px-0");
    			add_location(h3, file$2, 41, 28, 1614);
    			attr_dev(p0, "class", "col-12 px-0 mt-0 mb-4 text-secondary");
    			add_location(p0, file$2, 44, 28, 1748);
    			attr_dev(div3, "class", "row justify-content-start text-right ");
    			add_location(div3, file$2, 40, 24, 1534);
    			attr_dev(div4, "class", "col-12");
    			add_location(div4, file$2, 39, 20, 1489);
    			attr_dev(label0, "for", "email");
    			attr_dev(label0, "class", "form-label");
    			add_location(label0, file$2, 52, 26, 2093);
    			attr_dev(input0, "type", "email");
    			attr_dev(input0, "class", "form-control");
    			attr_dev(input0, "id", "email");
    			attr_dev(input0, "aria-describedby", "emailHelp");
    			add_location(input0, file$2, 53, 26, 2171);
    			attr_dev(div5, "class", "mb-3 font-size-customize-sign");
    			add_location(div5, file$2, 51, 24, 2023);
    			attr_dev(label1, "for", "password");
    			attr_dev(label1, "class", "form-label");
    			add_location(label1, file$2, 57, 26, 2503);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "id", "password");
    			add_location(input1, file$2, 58, 26, 2587);
    			attr_dev(div6, "class", "mb-3 font-size-customize-sign");
    			add_location(div6, file$2, 56, 24, 2433);
    			attr_dev(a0, "href", "signup");
    			attr_dev(a0, "class", "text-bold text-primary");
    			add_location(a0, file$2, 61, 27, 2768);
    			attr_dev(p1, "class", "col-12 mt-2 text-right px-0");
    			add_location(p1, file$2, 60, 24, 2701);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "my-4 btn btn-primary btn-lg font rounded-circle rounded-pill col-12");
    			add_location(button, file$2, 63, 24, 2906);
    			attr_dev(form, "action", "");
    			attr_dev(form, "method", "");
    			add_location(form, file$2, 50, 20, 1972);
    			attr_dev(div7, "class", "col-12 col-md-7 col-lg-9 col-xl-7 bg-white pt-4 pb-2 px-4 border-radius-form-sign shadow");
    			add_location(div7, file$2, 38, 16, 1366);
    			attr_dev(a1, "href", "signup");
    			attr_dev(a1, "class", "text-bold text-primary");
    			add_location(a1, file$2, 68, 44, 3197);
    			attr_dev(p2, "class", "col-12 mt-5 text-center");
    			add_location(p2, file$2, 67, 16, 3117);
    			attr_dev(div8, "class", "row justify-content-center");
    			add_location(div8, file$2, 29, 12, 882);
    			attr_dev(div9, "class", "col-12 col-lg-6 ");
    			add_location(div9, file$2, 28, 8, 839);
    			attr_dev(div10, "class", "row justify-content-center mx-lg-2 ");
    			add_location(div10, file$2, 27, 4, 781);
    			attr_dev(main, "class", "container-fluid sign-parent  direction font-family");
    			add_location(main, file$2, 26, 0, 694);
    			if (img1.src !== (img1_src_value = "image/1.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "logo-image-signup-footer");
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$2, 79, 20, 3572);
    			attr_dev(h6, "class", "d-inline webName-signup-footer");
    			add_location(h6, file$2, 80, 20, 3656);
    			attr_dev(div11, "class", "col-12 pt-4 pt-md-0");
    			add_location(div11, file$2, 78, 16, 3518);
    			attr_dev(div12, "class", "row");
    			add_location(div12, file$2, 77, 12, 3484);
    			attr_dev(div13, "class", "col-12 col-md-1 mr-md-5");
    			add_location(div13, file$2, 76, 8, 3434);
    			attr_dev(div14, "class", "col-6 py-1 py-md-0 col-md-1 px-0 mx-0 my-0 py-0 text-secondary");
    			add_location(div14, file$2, 87, 16, 3912);
    			attr_dev(a2, "href", "about");
    			attr_dev(a2, "class", " my-0 py-0 text-secondary");
    			add_location(a2, file$2, 89, 20, 4089);
    			attr_dev(div15, "class", "col-6 py-1 py-md-0 col-md-1 px-0 mx-0");
    			add_location(div15, file$2, 88, 16, 4017);
    			attr_dev(a3, "href", "contact");
    			attr_dev(a3, "class", " my-0 py-0 text-secondary");
    			add_location(a3, file$2, 94, 20, 4310);
    			attr_dev(div16, "class", "col-6 py-1 py-md-0 col-md-1 px-0 mx-0");
    			add_location(div16, file$2, 93, 16, 4238);
    			attr_dev(a4, "href", "/");
    			attr_dev(a4, "class", " my-0 py-0 text-secondary");
    			add_location(a4, file$2, 99, 20, 4534);
    			attr_dev(div17, "class", "col-6 py-1 py-md-0 col-md-1 px-0 mx-0");
    			add_location(div17, file$2, 98, 16, 4462);
    			attr_dev(a5, "href", "profile");
    			attr_dev(a5, "class", " my-0 py-0 text-secondary");
    			add_location(a5, file$2, 104, 20, 4747);
    			attr_dev(div18, "class", "col-6 py-1 py-md-0 col-md-1 px-0 mx-0");
    			add_location(div18, file$2, 103, 16, 4675);
    			attr_dev(a6, "href", "magezine");
    			attr_dev(a6, "class", " my-0 py-0 text-secondary");
    			add_location(a6, file$2, 109, 20, 4969);
    			attr_dev(div19, "class", "col-6 py-1 py-md-0 col-md-1 px-0 mx-0");
    			add_location(div19, file$2, 108, 16, 4897);
    			attr_dev(a7, "href", "signup");
    			attr_dev(a7, "class", " my-0 py-0 text-secondary");
    			add_location(a7, file$2, 114, 20, 5176);
    			attr_dev(div20, "class", "col-6 col-md-1 px-0 mx-0");
    			add_location(div20, file$2, 113, 16, 5117);
    			attr_dev(a8, "href", "login");
    			attr_dev(a8, "class", " my-0 py-0 text-secondary");
    			add_location(a8, file$2, 119, 20, 5397);
    			attr_dev(div21, "class", "col-6 py-1 py-md-0 col-md-1 px-0 mx-0");
    			add_location(div21, file$2, 118, 16, 5325);
    			attr_dev(div22, "class", "row font-size-footer-sign");
    			add_location(div22, file$2, 85, 12, 3839);
    			attr_dev(div23, "class", "col-12 col-md-7 mx-3 mx-md-0 mt-1");
    			add_location(div23, file$2, 84, 8, 3779);
    			attr_dev(div24, "class", "row px-1");
    			add_location(div24, file$2, 75, 4, 3403);
    			attr_dev(div25, "class", "mt-3 mb-0 container-fluid bg-white p-3 direction");
    			add_location(div25, file$2, 74, 0, 3336);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div10);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, img0);
    			append_dev(div0, t1);
    			append_dev(div0, h4);
    			append_dev(div8, t3);
    			append_dev(div8, div7);
    			append_dev(div7, div4);
    			append_dev(div4, div3);
    			append_dev(div3, h3);
    			append_dev(div3, t5);
    			append_dev(div3, p0);
    			append_dev(div7, t7);
    			append_dev(div7, form);
    			append_dev(form, div5);
    			append_dev(div5, label0);
    			append_dev(div5, t9);
    			append_dev(div5, input0);
    			append_dev(form, t10);
    			append_dev(form, div6);
    			append_dev(div6, label1);
    			append_dev(div6, t12);
    			append_dev(div6, input1);
    			append_dev(form, t13);
    			append_dev(form, p1);
    			append_dev(p1, a0);
    			append_dev(form, t15);
    			append_dev(form, button);
    			append_dev(div8, t17);
    			append_dev(div8, p2);
    			append_dev(p2, t18);
    			append_dev(p2, a1);
    			insert_dev(target, t20, anchor);
    			insert_dev(target, div25, anchor);
    			append_dev(div25, div24);
    			append_dev(div24, div13);
    			append_dev(div13, div12);
    			append_dev(div12, div11);
    			append_dev(div11, img1);
    			append_dev(div11, t21);
    			append_dev(div11, h6);
    			append_dev(div24, t23);
    			append_dev(div24, div23);
    			append_dev(div23, div22);
    			append_dev(div22, div14);
    			append_dev(div22, t25);
    			append_dev(div22, div15);
    			append_dev(div15, a2);
    			append_dev(div22, t27);
    			append_dev(div22, div16);
    			append_dev(div16, a3);
    			append_dev(div22, t29);
    			append_dev(div22, div17);
    			append_dev(div17, a4);
    			append_dev(div22, t31);
    			append_dev(div22, div18);
    			append_dev(div18, a5);
    			append_dev(div22, t33);
    			append_dev(div22, div19);
    			append_dev(div19, a6);
    			append_dev(div22, t35);
    			append_dev(div22, div20);
    			append_dev(div20, a7);
    			append_dev(div22, t37);
    			append_dev(div22, div21);
    			append_dev(div21, a8);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "scroll", () => {
    						scrolling = true;
    						clearTimeout(scrolling_timeout);
    						scrolling_timeout = setTimeout_1$2(clear_scrolling, 100);
    						/*onwindowscroll*/ ctx[4]();
    					}),
    					listen_dev(window, "resize", /*onwindowresize*/ ctx[5])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*y*/ 1 && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window.pageXOffset, /*y*/ ctx[0]);
    				scrolling_timeout = setTimeout_1$2(clear_scrolling, 100);
    			}

    			if (/*loading*/ ctx[3] === true) {
    				if (if_block) {
    					if (dirty & /*loading*/ 8) {
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
    			if (detaching) detach_dev(t20);
    			if (detaching) detach_dev(div25);
    			mounted = false;
    			run_all(dispose);
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
    	validate_slots("Login", slots, []);
    	let y = 0;
    	let x = 0;
    	let h = 0;
    	let loading = false;

    	setTimeout(
    		function () {
    			$$invalidate(3, loading = false);
    		},
    		2000
    	);

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Login> was created with unknown prop '${key}'`);
    	});

    	function onwindowscroll() {
    		$$invalidate(0, y = window.pageYOffset);
    	}

    	function onwindowresize() {
    		$$invalidate(1, x = window.innerWidth);
    		$$invalidate(2, h = window.innerHeight);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		fade,
    		slide,
    		scale,
    		fly,
    		Wave,
    		y,
    		x,
    		h,
    		loading
    	});

    	$$self.$inject_state = $$props => {
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    		if ("x" in $$props) $$invalidate(1, x = $$props.x);
    		if ("h" in $$props) $$invalidate(2, h = $$props.h);
    		if ("loading" in $$props) $$invalidate(3, loading = $$props.loading);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [y, x, h, loading, onwindowscroll, onwindowresize];
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Login",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/pages/Log_Sign/signup.svelte generated by Svelte v3.38.3 */

    const { setTimeout: setTimeout_1$1 } = globals;
    const file$1 = "src/pages/Log_Sign/signup.svelte";

    // (20:0) {#if loading===true}
    function create_if_block$1(ctx) {
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
    			add_location(span, file$1, 21, 66, 546);
    			set_style(div, "direction", "rtl");
    			set_style(div, "text-align", "center");
    			set_style(div, "margin", "auto");
    			set_style(div, "width", "100%");
    			set_style(div, "height", "100%");
    			add_location(div, file$1, 20, 1, 394);
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
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(20:0) {#if loading===true}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let scrolling = false;

    	let clear_scrolling = () => {
    		scrolling = false;
    	};

    	let scrolling_timeout;
    	let t0;
    	let main;
    	let div10;
    	let div9;
    	let div8;
    	let div2;
    	let div1;
    	let div0;
    	let img0;
    	let img0_src_value;
    	let t1;
    	let h4;
    	let t3;
    	let h2;
    	let t5;
    	let div7;
    	let form;
    	let div3;
    	let label0;
    	let t7;
    	let input0;
    	let t8;
    	let div4;
    	let label1;
    	let t10;
    	let input1;
    	let t11;
    	let button0;
    	let t13;
    	let div6;
    	let div5;
    	let span0;
    	let hr0;
    	let t14;
    	let span1;
    	let t16;
    	let span2;
    	let hr1;
    	let t17;
    	let button1;
    	let span3;
    	let t19;
    	let i;
    	let t20;
    	let p;
    	let t21;
    	let a0;
    	let main_transition;
    	let t23;
    	let div25;
    	let div24;
    	let div13;
    	let div12;
    	let div11;
    	let img1;
    	let img1_src_value;
    	let t24;
    	let h6;
    	let t26;
    	let div23;
    	let div22;
    	let div14;
    	let t28;
    	let div15;
    	let a1;
    	let t30;
    	let div16;
    	let a2;
    	let t32;
    	let div17;
    	let a3;
    	let t34;
    	let div18;
    	let a4;
    	let t36;
    	let div19;
    	let a5;
    	let t38;
    	let div20;
    	let a6;
    	let t40;
    	let div21;
    	let a7;
    	let current;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowscroll*/ ctx[4]);
    	add_render_callback(/*onwindowresize*/ ctx[5]);
    	let if_block = /*loading*/ ctx[3] === true && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t0 = space();
    			main = element("main");
    			div10 = element("div");
    			div9 = element("div");
    			div8 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			img0 = element("img");
    			t1 = space();
    			h4 = element("h4");
    			h4.textContent = "اینولینکس";
    			t3 = space();
    			h2 = element("h2");
    			h2.textContent = "از زندگی حرفه ای خود نهایت استفاده را ببرید";
    			t5 = space();
    			div7 = element("div");
    			form = element("form");
    			div3 = element("div");
    			label0 = element("label");
    			label0.textContent = "ایمیل";
    			t7 = space();
    			input0 = element("input");
    			t8 = space();
    			div4 = element("div");
    			label1 = element("label");
    			label1.textContent = "رمزعبور (حداقل ۶ کارکتر)";
    			t10 = space();
    			input1 = element("input");
    			t11 = space();
    			button0 = element("button");
    			button0.textContent = "ثبت نام";
    			t13 = space();
    			div6 = element("div");
    			div5 = element("div");
    			span0 = element("span");
    			hr0 = element("hr");
    			t14 = space();
    			span1 = element("span");
    			span1.textContent = "یا";
    			t16 = space();
    			span2 = element("span");
    			hr1 = element("hr");
    			t17 = space();
    			button1 = element("button");
    			span3 = element("span");
    			span3.textContent = "ثبت نام با اکانت گوگل";
    			t19 = space();
    			i = element("i");
    			t20 = space();
    			p = element("p");
    			t21 = text("تاکنون ثبت نام کرده اید؟ ");
    			a0 = element("a");
    			a0.textContent = "واردشوید";
    			t23 = space();
    			div25 = element("div");
    			div24 = element("div");
    			div13 = element("div");
    			div12 = element("div");
    			div11 = element("div");
    			img1 = element("img");
    			t24 = space();
    			h6 = element("h6");
    			h6.textContent = "اینولینکس";
    			t26 = space();
    			div23 = element("div");
    			div22 = element("div");
    			div14 = element("div");
    			div14.textContent = "© ۲۰۲۱";
    			t28 = space();
    			div15 = element("div");
    			a1 = element("a");
    			a1.textContent = "درباره ما";
    			t30 = space();
    			div16 = element("div");
    			a2 = element("a");
    			a2.textContent = "تماس با ما";
    			t32 = space();
    			div17 = element("div");
    			a3 = element("a");
    			a3.textContent = "خانه";
    			t34 = space();
    			div18 = element("div");
    			a4 = element("a");
    			a4.textContent = "پروفایل";
    			t36 = space();
    			div19 = element("div");
    			a5 = element("a");
    			a5.textContent = "مجله";
    			t38 = space();
    			div20 = element("div");
    			a6 = element("a");
    			a6.textContent = "تبت نام";
    			t40 = space();
    			div21 = element("div");
    			a7 = element("a");
    			a7.textContent = "ورود";
    			if (img0.src !== (img0_src_value = "image/1.png")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "class", "logo-image-signup");
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$1, 33, 28, 1120);
    			attr_dev(h4, "class", "d-inline webName-signup");
    			add_location(h4, file$1, 34, 28, 1205);
    			attr_dev(div0, "class", "col-12 pt-4 pt-md-0");
    			add_location(div0, file$1, 32, 24, 1058);
    			attr_dev(h2, "class", "col-12 my-4");
    			add_location(h2, file$1, 36, 24, 1311);
    			attr_dev(div1, "class", "row justify-content-center text-center ");
    			add_location(div1, file$1, 31, 20, 980);
    			attr_dev(div2, "class", "col-12");
    			add_location(div2, file$1, 30, 16, 939);
    			attr_dev(label0, "for", "email");
    			attr_dev(label0, "class", "form-label");
    			add_location(label0, file$1, 44, 26, 1741);
    			attr_dev(input0, "type", "email");
    			attr_dev(input0, "class", "form-control");
    			attr_dev(input0, "id", "email");
    			attr_dev(input0, "aria-describedby", "emailHelp");
    			add_location(input0, file$1, 45, 26, 1819);
    			attr_dev(div3, "class", "mb-3 font-size-customize-sign");
    			add_location(div3, file$1, 43, 24, 1671);
    			attr_dev(label1, "for", "password");
    			attr_dev(label1, "class", "form-label");
    			add_location(label1, file$1, 49, 26, 2151);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "class", "form-control");
    			attr_dev(input1, "id", "password");
    			add_location(input1, file$1, 50, 26, 2251);
    			attr_dev(div4, "class", "mb-3 font-size-customize-sign");
    			add_location(div4, file$1, 48, 24, 2081);
    			attr_dev(button0, "type", "submit");
    			attr_dev(button0, "class", "mt-3 btn btn-primary btn-lg font rounded-circle rounded-pill col-12");
    			add_location(button0, file$1, 52, 24, 2365);
    			add_location(hr0, file$1, 55, 71, 2665);
    			attr_dev(span0, "class", "col-5 pl-0 ml-0 d-inline");
    			add_location(span0, file$1, 55, 32, 2626);
    			attr_dev(span1, "class", "col-2 px-0 mx-0 d-inline text-center");
    			add_location(span1, file$1, 56, 32, 2709);
    			add_location(hr1, file$1, 57, 71, 2841);
    			attr_dev(span2, "class", "col-5 pr-0 mr-0 d-inline");
    			add_location(span2, file$1, 57, 32, 2802);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file$1, 54, 28, 2576);
    			attr_dev(div6, "class", "my-3 font-size-customize-sign");
    			add_location(div6, file$1, 53, 24, 2504);
    			add_location(span3, file$1, 61, 28, 3100);
    			attr_dev(i, "class", "fab fa-google text-color-custom");
    			add_location(i, file$1, 62, 28, 3163);
    			attr_dev(button1, "type", "submit");
    			attr_dev(button1, "class", "btn btn-white border-2 border-primary btn-lg font rounded-circle text-primary rounded-pill col-12");
    			add_location(button1, file$1, 60, 24, 2943);
    			attr_dev(a0, "href", "login");
    			attr_dev(a0, "class", "text-bold text-primary");
    			add_location(a0, file$1, 65, 53, 3358);
    			attr_dev(p, "class", "col-12 mt-2 text-center");
    			add_location(p, file$1, 64, 24, 3269);
    			attr_dev(form, "action", "");
    			attr_dev(form, "method", "");
    			add_location(form, file$1, 42, 20, 1620);
    			attr_dev(div7, "class", "col-12 col-md-7 col-lg-9 col-xl-7 bg-white pt-4 pb-2 px-3 border-radius-form-sign");
    			add_location(div7, file$1, 41, 16, 1504);
    			attr_dev(div8, "class", "row justify-content-center");
    			add_location(div8, file$1, 29, 12, 882);
    			attr_dev(div9, "class", "col-12 col-lg-6 ");
    			add_location(div9, file$1, 28, 8, 839);
    			attr_dev(div10, "class", "row justify-content-center mx-lg-2 ");
    			add_location(div10, file$1, 27, 4, 781);
    			attr_dev(main, "class", "container-fluid sign-parent  direction font-family");
    			add_location(main, file$1, 26, 0, 694);
    			if (img1.src !== (img1_src_value = "image/1.png")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "logo-image-signup-footer");
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$1, 78, 20, 3789);
    			attr_dev(h6, "class", "d-inline webName-signup-footer");
    			add_location(h6, file$1, 79, 20, 3873);
    			attr_dev(div11, "class", "col-12 pt-4 pt-md-0");
    			add_location(div11, file$1, 77, 16, 3735);
    			attr_dev(div12, "class", "row");
    			add_location(div12, file$1, 76, 12, 3701);
    			attr_dev(div13, "class", "col-12 col-md-1 mr-md-5");
    			add_location(div13, file$1, 75, 8, 3651);
    			attr_dev(div14, "class", "col-6 py-1 py-md-0 col-md-1 px-0 mx-0 my-0 py-0 text-secondary");
    			add_location(div14, file$1, 86, 16, 4129);
    			attr_dev(a1, "href", "about");
    			attr_dev(a1, "class", " my-0 py-0 text-secondary");
    			add_location(a1, file$1, 88, 20, 4306);
    			attr_dev(div15, "class", "col-6 py-1 py-md-0 col-md-1 px-0 mx-0");
    			add_location(div15, file$1, 87, 16, 4234);
    			attr_dev(a2, "href", "contact");
    			attr_dev(a2, "class", " my-0 py-0 text-secondary");
    			add_location(a2, file$1, 93, 20, 4527);
    			attr_dev(div16, "class", "col-6 py-1 py-md-0 col-md-1 px-0 mx-0");
    			add_location(div16, file$1, 92, 16, 4455);
    			attr_dev(a3, "href", "/");
    			attr_dev(a3, "class", " my-0 py-0 text-secondary");
    			add_location(a3, file$1, 98, 20, 4751);
    			attr_dev(div17, "class", "col-6 py-1 py-md-0 col-md-1 px-0 mx-0");
    			add_location(div17, file$1, 97, 16, 4679);
    			attr_dev(a4, "href", "profile");
    			attr_dev(a4, "class", " my-0 py-0 text-secondary");
    			add_location(a4, file$1, 103, 20, 4964);
    			attr_dev(div18, "class", "col-6 py-1 py-md-0 col-md-1 px-0 mx-0");
    			add_location(div18, file$1, 102, 16, 4892);
    			attr_dev(a5, "href", "magezine");
    			attr_dev(a5, "class", " my-0 py-0 text-secondary");
    			add_location(a5, file$1, 108, 20, 5186);
    			attr_dev(div19, "class", "col-6 py-1 py-md-0 col-md-1 px-0 mx-0");
    			add_location(div19, file$1, 107, 16, 5114);
    			attr_dev(a6, "href", "signup");
    			attr_dev(a6, "class", " my-0 py-0 text-secondary");
    			add_location(a6, file$1, 113, 20, 5393);
    			attr_dev(div20, "class", "col-6 col-md-1 px-0 mx-0");
    			add_location(div20, file$1, 112, 16, 5334);
    			attr_dev(a7, "href", "login");
    			attr_dev(a7, "class", " my-0 py-0 text-secondary");
    			add_location(a7, file$1, 118, 20, 5614);
    			attr_dev(div21, "class", "col-6 py-1 py-md-0 col-md-1 px-0 mx-0");
    			add_location(div21, file$1, 117, 16, 5542);
    			attr_dev(div22, "class", "row font-size-footer-sign");
    			add_location(div22, file$1, 84, 12, 4056);
    			attr_dev(div23, "class", "col-12 col-md-7 mx-3 mx-md-0 mt-1");
    			add_location(div23, file$1, 83, 8, 3996);
    			attr_dev(div24, "class", "row px-1");
    			add_location(div24, file$1, 74, 4, 3620);
    			attr_dev(div25, "class", "mt-3 mb-0 container-fluid bg-white p-3 direction");
    			add_location(div25, file$1, 73, 0, 3553);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div10);
    			append_dev(div10, div9);
    			append_dev(div9, div8);
    			append_dev(div8, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, img0);
    			append_dev(div0, t1);
    			append_dev(div0, h4);
    			append_dev(div1, t3);
    			append_dev(div1, h2);
    			append_dev(div8, t5);
    			append_dev(div8, div7);
    			append_dev(div7, form);
    			append_dev(form, div3);
    			append_dev(div3, label0);
    			append_dev(div3, t7);
    			append_dev(div3, input0);
    			append_dev(form, t8);
    			append_dev(form, div4);
    			append_dev(div4, label1);
    			append_dev(div4, t10);
    			append_dev(div4, input1);
    			append_dev(form, t11);
    			append_dev(form, button0);
    			append_dev(form, t13);
    			append_dev(form, div6);
    			append_dev(div6, div5);
    			append_dev(div5, span0);
    			append_dev(span0, hr0);
    			append_dev(div5, t14);
    			append_dev(div5, span1);
    			append_dev(div5, t16);
    			append_dev(div5, span2);
    			append_dev(span2, hr1);
    			append_dev(form, t17);
    			append_dev(form, button1);
    			append_dev(button1, span3);
    			append_dev(button1, t19);
    			append_dev(button1, i);
    			append_dev(form, t20);
    			append_dev(form, p);
    			append_dev(p, t21);
    			append_dev(p, a0);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, div25, anchor);
    			append_dev(div25, div24);
    			append_dev(div24, div13);
    			append_dev(div13, div12);
    			append_dev(div12, div11);
    			append_dev(div11, img1);
    			append_dev(div11, t24);
    			append_dev(div11, h6);
    			append_dev(div24, t26);
    			append_dev(div24, div23);
    			append_dev(div23, div22);
    			append_dev(div22, div14);
    			append_dev(div22, t28);
    			append_dev(div22, div15);
    			append_dev(div15, a1);
    			append_dev(div22, t30);
    			append_dev(div22, div16);
    			append_dev(div16, a2);
    			append_dev(div22, t32);
    			append_dev(div22, div17);
    			append_dev(div17, a3);
    			append_dev(div22, t34);
    			append_dev(div22, div18);
    			append_dev(div18, a4);
    			append_dev(div22, t36);
    			append_dev(div22, div19);
    			append_dev(div19, a5);
    			append_dev(div22, t38);
    			append_dev(div22, div20);
    			append_dev(div20, a6);
    			append_dev(div22, t40);
    			append_dev(div22, div21);
    			append_dev(div21, a7);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "scroll", () => {
    						scrolling = true;
    						clearTimeout(scrolling_timeout);
    						scrolling_timeout = setTimeout_1$1(clear_scrolling, 100);
    						/*onwindowscroll*/ ctx[4]();
    					}),
    					listen_dev(window, "resize", /*onwindowresize*/ ctx[5])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*y*/ 1 && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window.pageXOffset, /*y*/ ctx[0]);
    				scrolling_timeout = setTimeout_1$1(clear_scrolling, 100);
    			}

    			if (/*loading*/ ctx[3] === true) {
    				if (if_block) {
    					if (dirty & /*loading*/ 8) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$1(ctx);
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
    			if (detaching) detach_dev(t23);
    			if (detaching) detach_dev(div25);
    			mounted = false;
    			run_all(dispose);
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
    	validate_slots("Signup", slots, []);
    	let y = 0;
    	let x = 0;
    	let h = 0;
    	let loading = false;

    	setTimeout(
    		function () {
    			$$invalidate(3, loading = false);
    		},
    		2000
    	);

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Signup> was created with unknown prop '${key}'`);
    	});

    	function onwindowscroll() {
    		$$invalidate(0, y = window.pageYOffset);
    	}

    	function onwindowresize() {
    		$$invalidate(1, x = window.innerWidth);
    		$$invalidate(2, h = window.innerHeight);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		fade,
    		slide,
    		scale,
    		fly,
    		Wave,
    		y,
    		x,
    		h,
    		loading
    	});

    	$$self.$inject_state = $$props => {
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    		if ("x" in $$props) $$invalidate(1, x = $$props.x);
    		if ("h" in $$props) $$invalidate(2, h = $$props.h);
    		if ("loading" in $$props) $$invalidate(3, loading = $$props.loading);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [y, x, h, loading, onwindowscroll, onwindowresize];
    }

    class Signup extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Signup",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.38.3 */

    const { setTimeout: setTimeout_1, window: window_1 } = globals;
    const file = "src/App.svelte";

    // (31:0) {#if loading===true}
    function create_if_block_4(ctx) {
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
    			add_location(span, file, 32, 66, 916);
    			set_style(div, "direction", "rtl");
    			set_style(div, "text-align", "center");
    			set_style(div, "margin", "auto");
    			set_style(div, "width", "100%");
    			set_style(div, "height", "100%");
    			add_location(div, file, 31, 1, 764);
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
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(31:0) {#if loading===true}",
    		ctx
    	});

    	return block;
    }

    // (39:0) {#if loading===false}
    function create_if_block(ctx) {
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let t;
    	let script;
    	let script_src_value;
    	let current;
    	const if_block_creators = [create_if_block_1, create_if_block_2, create_if_block_3];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*lastSugment*/ ctx[3] !== "login" && /*lastSugment*/ ctx[3] !== "login#" && /*lastSugment*/ ctx[3] !== "signup#" && /*lastSugment*/ ctx[3] !== "signup") return 0;
    		if (/*lastSugment*/ ctx[3] === "login") return 1;
    		if (/*lastSugment*/ ctx[3] === "signup") return 2;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			t = space();
    			script = element("script");
    			attr_dev(div, "class", "class");
    			add_location(div, file, 39, 0, 1066);
    			if (script.src !== (script_src_value = "/script.js")) attr_dev(script, "src", script_src_value);
    			add_location(script, file, 49, 1, 1334);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(div, null);
    			}

    			insert_dev(target, t, anchor);
    			insert_dev(target, script, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (if_block) if_block.p(ctx, dirty);
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
    			if (detaching) detach_dev(div);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}

    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(script);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(39:0) {#if loading===false}",
    		ctx
    	});

    	return block;
    }

    // (46:34) 
    function create_if_block_3(ctx) {
    	let signup;
    	let current;
    	signup = new Signup({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(signup.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(signup, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(signup.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(signup.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(signup, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(46:34) ",
    		ctx
    	});

    	return block;
    }

    // (44:33) 
    function create_if_block_2(ctx) {
    	let login;
    	let current;
    	login = new Login({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(login.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(login, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(login.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(login.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(login, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(44:33) ",
    		ctx
    	});

    	return block;
    }

    // (41:1) {#if lastSugment!=='login' && lastSugment!=='login#' &&  lastSugment!=='signup#' &&  lastSugment!=='signup'}
    function create_if_block_1(ctx) {
    	let nav;
    	let t;
    	let footer;
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
    			create_component(nav.$$.fragment);
    			t = space();
    			create_component(footer.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(nav, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(footer, target, anchor);
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
    			destroy_component(nav, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(footer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(41:1) {#if lastSugment!=='login' && lastSugment!=='login#' &&  lastSugment!=='signup#' &&  lastSugment!=='signup'}",
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
    	add_render_callback(/*onwindowscroll*/ ctx[4]);
    	add_render_callback(/*onwindowresize*/ ctx[5]);
    	let if_block0 = /*loading*/ ctx[2] === true && create_if_block_4(ctx);
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
    					listen_dev(window_1, "scroll", () => {
    						scrolling = true;
    						clearTimeout(scrolling_timeout);
    						scrolling_timeout = setTimeout_1(clear_scrolling, 100);
    						/*onwindowscroll*/ ctx[4]();
    					}),
    					listen_dev(window_1, "resize", /*onwindowresize*/ ctx[5])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*y*/ 1 && !scrolling) {
    				scrolling = true;
    				clearTimeout(scrolling_timeout);
    				scrollTo(window_1.pageXOffset, /*y*/ ctx[0]);
    				scrolling_timeout = setTimeout_1(clear_scrolling, 100);
    			}

    			if (/*loading*/ ctx[2] === true) {
    				if (if_block0) {
    					if (dirty & /*loading*/ 4) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_4(ctx);
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
    	let currentLocation = window.location.href;

    	let splitUrl = currentLocation.split("/");
    	let lastSugment = splitUrl[splitUrl.length - 1];
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
    		$$invalidate(0, y = window_1.pageYOffset);
    	}

    	function onwindowresize() {
    		$$invalidate(1, x = window_1.innerWidth);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		Nav,
    		Footer,
    		Login,
    		Signup,
    		fade,
    		slide,
    		scale,
    		fly,
    		Wave,
    		y,
    		x,
    		currentLocation,
    		splitUrl,
    		lastSugment,
    		loading
    	});

    	$$self.$inject_state = $$props => {
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    		if ("x" in $$props) $$invalidate(1, x = $$props.x);
    		if ("currentLocation" in $$props) currentLocation = $$props.currentLocation;
    		if ("splitUrl" in $$props) splitUrl = $$props.splitUrl;
    		if ("lastSugment" in $$props) $$invalidate(3, lastSugment = $$props.lastSugment);
    		if ("loading" in $$props) $$invalidate(2, loading = $$props.loading);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [y, x, loading, lastSugment, onwindowscroll, onwindowresize];
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
