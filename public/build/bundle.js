
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

    function create_fragment$a(ctx) {
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
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, { basepath: 3, url: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$a.name
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
    function create_if_block$1(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1$1, create_else_block];
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
    		id: create_if_block$1.name,
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
    function create_if_block_1$1(ctx) {
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
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(41:2) {#if component !== null}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*$activeRoute*/ ctx[1] !== null && /*$activeRoute*/ ctx[1].route === /*route*/ ctx[7] && create_if_block$1(ctx);

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
    					if_block = create_if_block$1(ctx);
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
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { path: 8, component: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Route",
    			options,
    			id: create_fragment$9.name
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
    const file$7 = "node_modules/svelte-routing/src/Link.svelte";

    function create_fragment$8(ctx) {
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
    			add_location(a, file$7, 40, 0, 1249);
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
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
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

    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {
    			to: 7,
    			replace: 8,
    			state: 9,
    			getProps: 10
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Link",
    			options,
    			id: create_fragment$8.name
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
    const file$6 = "src/pages/about.svelte";

    function create_fragment$7(ctx) {
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
    			add_location(div, file$6, 8, 0, 151);
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
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("About", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<About> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ fade, slide, scale });
    	return [];
    }

    class About extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "About",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/pages/contact.svelte generated by Svelte v3.38.3 */

    function create_fragment$6(ctx) {
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
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
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
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Contact",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/pages/blog.svelte generated by Svelte v3.38.3 */
    const file$5 = "src/pages/blog.svelte";

    function create_fragment$5(ctx) {
    	let scrolling = false;

    	let clear_scrolling = () => {
    		scrolling = false;
    	};

    	let scrolling_timeout;
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
    	let aside3;
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
    	let t10;
    	let i2;
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
    	let div57;
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
    	let t19;
    	let i5;
    	let t20;
    	let span0;
    	let i6;
    	let t21;
    	let t22;
    	let div20;
    	let i7;
    	let t23;
    	let ul1;
    	let li2;
    	let a4;
    	let i8;
    	let t24;
    	let t25;
    	let li3;
    	let a5;
    	let i9;
    	let t26;
    	let t27;
    	let li4;
    	let a6;
    	let i10;
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
    	let t33;
    	let span1;
    	let span2;
    	let t36;
    	let span3;
    	let t38;
    	let div25;
    	let a8;
    	let button2;
    	let t40;
    	let hr0;
    	let t41;
    	let div27;
    	let a9;
    	let img5;
    	let img5_src_value;
    	let t42;
    	let span4;
    	let t44;
    	let t45;
    	let div26;
    	let i11;
    	let t46;
    	let t47;
    	let article1;
    	let div35;
    	let div34;
    	let div32;
    	let div31;
    	let div28;
    	let img6;
    	let img6_src_value;
    	let t48;
    	let div30;
    	let div29;
    	let h63;
    	let a10;
    	let t49;
    	let i12;
    	let t50;
    	let span5;
    	let i13;
    	let t51;
    	let t52;
    	let div33;
    	let i14;
    	let t53;
    	let ul2;
    	let li5;
    	let a11;
    	let i15;
    	let t54;
    	let t55;
    	let li6;
    	let a12;
    	let i16;
    	let t56;
    	let t57;
    	let li7;
    	let a13;
    	let i17;
    	let t58;
    	let t59;
    	let div36;
    	let h32;
    	let a14;
    	let t61;
    	let div37;
    	let img7;
    	let img7_src_value;
    	let t62;
    	let p1;
    	let t63;
    	let span6;
    	let span7;
    	let t66;
    	let span8;
    	let t68;
    	let div38;
    	let a15;
    	let button3;
    	let t70;
    	let hr1;
    	let t71;
    	let div40;
    	let a16;
    	let img8;
    	let img8_src_value;
    	let t72;
    	let span9;
    	let t74;
    	let t75;
    	let div39;
    	let i18;
    	let t76;
    	let t77;
    	let article2;
    	let div48;
    	let div47;
    	let div45;
    	let div44;
    	let div41;
    	let img9;
    	let img9_src_value;
    	let t78;
    	let div43;
    	let div42;
    	let h64;
    	let a17;
    	let t79;
    	let i19;
    	let t80;
    	let span10;
    	let i20;
    	let t81;
    	let t82;
    	let div46;
    	let i21;
    	let t83;
    	let ul3;
    	let li8;
    	let a18;
    	let i22;
    	let t84;
    	let t85;
    	let li9;
    	let a19;
    	let i23;
    	let t86;
    	let t87;
    	let li10;
    	let a20;
    	let i24;
    	let t88;
    	let t89;
    	let div49;
    	let h33;
    	let a21;
    	let t91;
    	let div50;
    	let img10;
    	let img10_src_value;
    	let t92;
    	let p2;
    	let t93;
    	let span11;
    	let span12;
    	let t96;
    	let span13;
    	let t98;
    	let div51;
    	let a22;
    	let button4;
    	let t100;
    	let hr2;
    	let t101;
    	let div53;
    	let a23;
    	let img11;
    	let img11_src_value;
    	let t102;
    	let span14;
    	let t104;
    	let t105;
    	let div52;
    	let i25;
    	let t106;
    	let t107;
    	let aside2;
    	let div56;
    	let div55;
    	let img12;
    	let img12_src_value;
    	let t108;
    	let h34;
    	let t110;
    	let h65;
    	let main_transition;
    	let t112;
    	let br0;
    	let hr3;
    	let br1;
    	let br2;
    	let br3;
    	let current;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowscroll*/ ctx[2]);

    	const block = {
    		c: function create() {
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
    			aside3 = element("aside");
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
    			t4 = text("آفرینه ");
    			i0 = element("i");
    			t5 = space();
    			h60 = element("h6");
    			i1 = element("i");
    			t6 = text(" تهران,شهرک طالقانی,ساحتمان نگین");
    			t7 = space();
    			h61 = element("h6");
    			h61.textContent = "به آفرینه محلق شوید و بروز باشید .می توانید مطالب مرتبط به کارآفرینی و بازاریابی رو از اینجا دنبال کنید اگر از محتوای ما خوشتان اومد آنرا  با دیگران به اشتراک بگذارید.";
    			t9 = space();
    			div8 = element("div");
    			div7 = element("div");
    			button0 = element("button");
    			t10 = text("بازدید سایت ");
    			i2 = element("i");
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
    			div57 = element("div");
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
    			t19 = text("مرکز رشد و نواوری آفرینه ");
    			i5 = element("i");
    			t20 = space();
    			span0 = element("span");
    			i6 = element("i");
    			t21 = text(" ۳ دقیقه قبل");
    			t22 = space();
    			div20 = element("div");
    			i7 = element("i");
    			t23 = space();
    			ul1 = element("ul");
    			li2 = element("li");
    			a4 = element("a");
    			i8 = element("i");
    			t24 = text(" ذخیره کردن پست");
    			t25 = space();
    			li3 = element("li");
    			a5 = element("a");
    			i9 = element("i");
    			t26 = text(" کپی کردن لینک");
    			t27 = space();
    			li4 = element("li");
    			a6 = element("a");
    			i10 = element("i");
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
    			t33 = text("طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید ");
    			span1 = element("span");
    			span1.textContent = "...";
    			span2 = element("span");
    			span2.textContent = "طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.";
    			t36 = space();
    			span3 = element("span");
    			span3.textContent = "بیشتر بخوانید";
    			t38 = space();
    			div25 = element("div");
    			a8 = element("a");
    			button2 = element("button");
    			button2.textContent = "ادامه مطلب";
    			t40 = space();
    			hr0 = element("hr");
    			t41 = space();
    			div27 = element("div");
    			a9 = element("a");
    			img5 = element("img");
    			t42 = space();
    			span4 = element("span");
    			span4.textContent = "مسعودآقایی ساداتی";
    			t44 = text("  ");
    			t45 = space();
    			div26 = element("div");
    			i11 = element("i");
    			t46 = text(" ۵۶");
    			t47 = space();
    			article1 = element("article");
    			div35 = element("div");
    			div34 = element("div");
    			div32 = element("div");
    			div31 = element("div");
    			div28 = element("div");
    			img6 = element("img");
    			t48 = space();
    			div30 = element("div");
    			div29 = element("div");
    			h63 = element("h6");
    			a10 = element("a");
    			t49 = text("مرکز رشد و نواوری آفرینه ");
    			i12 = element("i");
    			t50 = space();
    			span5 = element("span");
    			i13 = element("i");
    			t51 = text(" ۸ روز قبل");
    			t52 = space();
    			div33 = element("div");
    			i14 = element("i");
    			t53 = space();
    			ul2 = element("ul");
    			li5 = element("li");
    			a11 = element("a");
    			i15 = element("i");
    			t54 = text(" ذخیره کردن پست");
    			t55 = space();
    			li6 = element("li");
    			a12 = element("a");
    			i16 = element("i");
    			t56 = text(" کپی کردن لینک");
    			t57 = space();
    			li7 = element("li");
    			a13 = element("a");
    			i17 = element("i");
    			t58 = text(" گزارش دادن");
    			t59 = space();
    			div36 = element("div");
    			h32 = element("h3");
    			a14 = element("a");
    			a14.textContent = "نگاهی اجمالی به آخرین دستاوردهای شبکه اجتماعی فیس بوک";
    			t61 = space();
    			div37 = element("div");
    			img7 = element("img");
    			t62 = space();
    			p1 = element("p");
    			t63 = text("طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید ");
    			span6 = element("span");
    			span6.textContent = "...";
    			span7 = element("span");
    			span7.textContent = "طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.";
    			t66 = space();
    			span8 = element("span");
    			span8.textContent = "بیشتر بخوانید";
    			t68 = space();
    			div38 = element("div");
    			a15 = element("a");
    			button3 = element("button");
    			button3.textContent = "ادامه مطلب";
    			t70 = space();
    			hr1 = element("hr");
    			t71 = space();
    			div40 = element("div");
    			a16 = element("a");
    			img8 = element("img");
    			t72 = space();
    			span9 = element("span");
    			span9.textContent = "مسعودآقایی ساداتی";
    			t74 = text("  ");
    			t75 = space();
    			div39 = element("div");
    			i18 = element("i");
    			t76 = text(" ۱۴۲");
    			t77 = space();
    			article2 = element("article");
    			div48 = element("div");
    			div47 = element("div");
    			div45 = element("div");
    			div44 = element("div");
    			div41 = element("div");
    			img9 = element("img");
    			t78 = space();
    			div43 = element("div");
    			div42 = element("div");
    			h64 = element("h6");
    			a17 = element("a");
    			t79 = text("مرکز رشد و نواوری آفرینه ");
    			i19 = element("i");
    			t80 = space();
    			span10 = element("span");
    			i20 = element("i");
    			t81 = text(" ۳ دقیقه قبل");
    			t82 = space();
    			div46 = element("div");
    			i21 = element("i");
    			t83 = space();
    			ul3 = element("ul");
    			li8 = element("li");
    			a18 = element("a");
    			i22 = element("i");
    			t84 = text(" ذخیره کردن پست");
    			t85 = space();
    			li9 = element("li");
    			a19 = element("a");
    			i23 = element("i");
    			t86 = text(" کپی کردن لینک");
    			t87 = space();
    			li10 = element("li");
    			a20 = element("a");
    			i24 = element("i");
    			t88 = text(" گزارش دادن");
    			t89 = space();
    			div49 = element("div");
    			h33 = element("h3");
    			a21 = element("a");
    			a21.textContent = "راه های مدیریت کسب و کار الکترونیکی";
    			t91 = space();
    			div50 = element("div");
    			img10 = element("img");
    			t92 = space();
    			p2 = element("p");
    			t93 = text("طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                     صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                     برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید ");
    			span11 = element("span");
    			span11.textContent = "...";
    			span12 = element("span");
    			span12.textContent = "طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                                    برای پر کردن صفحه و ارایه اولیه شکل \n                                    ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                                    صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                                    تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.";
    			t96 = space();
    			span13 = element("span");
    			span13.textContent = "بیشتر بخوانید";
    			t98 = space();
    			div51 = element("div");
    			a22 = element("a");
    			button4 = element("button");
    			button4.textContent = "ادامه مطلب";
    			t100 = space();
    			hr2 = element("hr");
    			t101 = space();
    			div53 = element("div");
    			a23 = element("a");
    			img11 = element("img");
    			t102 = space();
    			span14 = element("span");
    			span14.textContent = "مجتبی اکبری";
    			t104 = text("  ");
    			t105 = space();
    			div52 = element("div");
    			i25 = element("i");
    			t106 = text(" ۱۲");
    			t107 = space();
    			aside2 = element("aside");
    			div56 = element("div");
    			div55 = element("div");
    			img12 = element("img");
    			t108 = space();
    			h34 = element("h3");
    			h34.textContent = "آفرینه";
    			t110 = space();
    			h65 = element("h6");
    			h65.textContent = "زندگی به سبک نوآوری";
    			t112 = space();
    			br0 = element("br");
    			hr3 = element("hr");
    			br1 = element("br");
    			br2 = element("br");
    			br3 = element("br");
    			document.title = "\n        اینولینکس\n    ";
    			attr_dev(img0, "class", "w-100 dream-job-image");
    			if (img0.src !== (img0_src_value = "image/job.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$5, 30, 32, 934);
    			attr_dev(a0, "href", "#");
    			add_location(a0, file$5, 29, 28, 889);
    			attr_dev(div0, "class", "col-12 my-1");
    			add_location(div0, file$5, 28, 24, 835);
    			attr_dev(div1, "class", "row ");
    			add_location(div1, file$5, 27, 20, 792);
    			attr_dev(div2, "class", "col-12 shadow-radius-section bg-light");
    			add_location(div2, file$5, 26, 16, 720);
    			attr_dev(div3, "class", "row");
    			add_location(div3, file$5, 25, 12, 686);
    			attr_dev(aside0, "class", "col-12 col-md-3 mr-2 ");
    			add_location(aside0, file$5, 24, 8, 635);
    			attr_dev(img1, "class", "w-100 header-image bg-light");
    			if (img1.src !== (img1_src_value = "image/head.jpeg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$5, 42, 28, 1406);
    			attr_dev(div4, "class", "col-12 p-0");
    			add_location(div4, file$5, 41, 24, 1353);
    			attr_dev(img2, "class", "header-logo-image");
    			if (img2.src !== (img2_src_value = "image/afarine.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$5, 45, 28, 1599);
    			attr_dev(div5, "class", "col-12 header-image-main");
    			add_location(div5, file$5, 44, 24, 1532);
    			set_style(i0, "color", "#048af7");
    			set_style(i0, "font-size", "20px");
    			attr_dev(i0, "class", "fas fa-check-circle");
    			add_location(i0, file$5, 50, 70, 1921);
    			attr_dev(h30, "class", "text-bold");
    			add_location(h30, file$5, 50, 36, 1887);
    			attr_dev(i1, "class", "fas fa-map-marker-alt");
    			add_location(i1, file$5, 51, 63, 2064);
    			attr_dev(h60, "class", "text-secondary");
    			add_location(h60, file$5, 51, 36, 2037);
    			attr_dev(h61, "class", "explain-about-page");
    			add_location(h61, file$5, 52, 36, 2180);
    			attr_dev(i2, "class", "fas fa-external-link-alt");
    			add_location(i2, file$5, 55, 137, 2646);
    			attr_dev(button0, "class", "btn btn-danger rounded-pill col-5 font text-center col-md-3 mx-1");
    			add_location(button0, file$5, 55, 44, 2553);
    			attr_dev(button1, "type", "button");
    			attr_dev(button1, "data-toggle", "dropdown");
    			attr_dev(button1, "class", "btn btn-danger rounded-pill col-12 font text-center col-md-6 mx-1");
    			add_location(button1, file$5, 57, 48, 2848);
    			attr_dev(i3, "class", "fas fa-share-alt");
    			add_location(i3, file$5, 59, 68, 3140);
    			attr_dev(a1, "href", "#");
    			add_location(a1, file$5, 59, 56, 3128);
    			add_location(li0, file$5, 59, 52, 3124);
    			attr_dev(i4, "class", "fas fa-flag");
    			add_location(i4, file$5, 60, 68, 3263);
    			attr_dev(a2, "href", "#");
    			add_location(a2, file$5, 60, 56, 3251);
    			add_location(li1, file$5, 60, 52, 3247);
    			attr_dev(ul0, "class", "dropdown-menu  ellipsis-menu");
    			add_location(ul0, file$5, 58, 48, 3030);
    			attr_dev(div6, "class", "col-5 justify-content-start dropdown dropleft");
    			add_location(div6, file$5, 56, 44, 2740);
    			attr_dev(div7, "class", "row");
    			add_location(div7, file$5, 54, 40, 2491);
    			attr_dev(div8, "class", "col-12 mt-4 font");
    			add_location(div8, file$5, 53, 36, 2420);
    			attr_dev(div9, "class", "col-10");
    			add_location(div9, file$5, 49, 32, 1830);
    			attr_dev(div10, "class", "row");
    			add_location(div10, file$5, 48, 28, 1780);
    			attr_dev(div11, "class", "header-detail col-12");
    			add_location(div11, file$5, 47, 24, 1717);
    			attr_dev(div12, "class", "row p-0 shadow-radius-section ");
    			add_location(div12, file$5, 40, 20, 1283);
    			attr_dev(div13, "class", "col-12 ");
    			add_location(div13, file$5, 39, 16, 1241);
    			attr_dev(div14, "class", "row ml-1 ");
    			add_location(div14, file$5, 38, 12, 1201);
    			attr_dev(img3, "class", "cu-image-com mr-1 ");
    			if (img3.src !== (img3_src_value = "image/afarine.jpg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "alt", "");
    			add_location(img3, file$5, 81, 52, 4475);
    			attr_dev(div15, "class", "col-2 col-sm-1 col-md-2 col-lg-1 p-0 pt-1");
    			add_location(div15, file$5, 80, 48, 4366);
    			set_style(i5, "color", "#048af7");
    			attr_dev(i5, "class", "fas fa-check-circle");
    			add_location(i5, file$5, 85, 102, 4902);
    			attr_dev(a3, "href", "#");
    			add_location(a3, file$5, 85, 60, 4860);
    			add_location(h62, file$5, 85, 56, 4856);
    			attr_dev(i6, "class", "fas fa-clock");
    			add_location(i6, file$5, 86, 88, 5058);
    			attr_dev(span0, "class", "show-time-custome");
    			add_location(span0, file$5, 86, 56, 5026);
    			attr_dev(div16, "class", "cu-intro mt-2");
    			add_location(div16, file$5, 84, 52, 4772);
    			attr_dev(div17, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-3 mr-lg-4 justify-content-center ");
    			add_location(div17, file$5, 83, 48, 4642);
    			attr_dev(div18, "class", "row ");
    			add_location(div18, file$5, 79, 44, 4299);
    			attr_dev(div19, "class", "col-11 col-md-11");
    			add_location(div19, file$5, 78, 40, 4223);
    			attr_dev(i7, "class", "fas fa-ellipsis-v ");
    			attr_dev(i7, "type", "button");
    			attr_dev(i7, "data-toggle", "dropdown");
    			add_location(i7, file$5, 92, 40, 5442);
    			attr_dev(i8, "class", "far fa-bookmark");
    			add_location(i8, file$5, 94, 101, 5696);
    			attr_dev(a4, "href", "#");
    			add_location(a4, file$5, 94, 89, 5684);
    			add_location(li2, file$5, 94, 44, 5639);
    			attr_dev(i9, "class", "fas fa-share-alt");
    			add_location(i9, file$5, 95, 60, 5813);
    			attr_dev(a5, "href", "#");
    			add_location(a5, file$5, 95, 48, 5801);
    			add_location(li3, file$5, 95, 44, 5797);
    			attr_dev(i10, "class", "fas fa-flag");
    			add_location(i10, file$5, 96, 60, 5930);
    			attr_dev(a6, "href", "#");
    			add_location(a6, file$5, 96, 48, 5918);
    			add_location(li4, file$5, 96, 44, 5914);
    			attr_dev(ul1, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul1, file$5, 93, 40, 5554);
    			attr_dev(div20, "class", "col-1 ml-0 pl-0 pr-4 dropdown");
    			add_location(div20, file$5, 91, 40, 5358);
    			attr_dev(div21, "class", "row justify-content-between p-2 ");
    			add_location(div21, file$5, 77, 36, 4136);
    			attr_dev(div22, "class", "col-12");
    			add_location(div22, file$5, 76, 32, 4079);
    			attr_dev(a7, "href", "#");
    			add_location(a7, file$5, 102, 80, 6290);
    			attr_dev(h31, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h31, file$5, 102, 36, 6246);
    			attr_dev(div23, "class", "col-12 p-0");
    			add_location(div23, file$5, 101, 32, 6185);
    			if (img4.src !== (img4_src_value = "image/30.jpg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img4, "alt", "");
    			add_location(img4, file$5, 105, 36, 6499);
    			attr_dev(div24, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div24, file$5, 104, 32, 6405);
    			attr_dev(span1, "id", "dots");
    			add_location(span1, file$5, 111, 122, 7094);
    			attr_dev(span2, "id", "more");
    			add_location(span2, file$5, 111, 148, 7120);
    			attr_dev(span3, "id", "myBtn");
    			set_style(span3, "cursor", "pointer");
    			add_location(span3, file$5, 118, 36, 7839);
    			attr_dev(p0, "class", "col-12 mt-3 post-text");
    			add_location(p0, file$5, 108, 32, 6686);
    			attr_dev(button2, "id", "read-more");
    			attr_dev(button2, "class", "btn btn-sm btn-danger col-12 col-md-2 my-1 p-1 offset-0 offset-md-10");
    			add_location(button2, file$5, 123, 40, 8141);
    			attr_dev(a8, "href", "#");
    			add_location(a8, file$5, 122, 36, 8088);
    			attr_dev(div25, "class", "col-12 ");
    			add_location(div25, file$5, 121, 32, 8030);
    			attr_dev(hr0, "class", "col-11 mx-auto");
    			add_location(hr0, file$5, 126, 32, 8373);
    			attr_dev(img5, "class", "personal-img");
    			if (img5.src !== (img5_src_value = "image/1.jpeg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "alt", "");
    			add_location(img5, file$5, 129, 40, 8566);
    			attr_dev(span4, "class", "personal-name");
    			add_location(span4, file$5, 130, 40, 8659);
    			attr_dev(a9, "class", "a-clicked");
    			attr_dev(a9, "href", "#");
    			add_location(a9, file$5, 128, 36, 8495);
    			attr_dev(i11, "class", "fas fa-eye");
    			add_location(i11, file$5, 132, 60, 8826);
    			attr_dev(div26, "class", "view-count");
    			add_location(div26, file$5, 132, 36, 8802);
    			attr_dev(div27, "class", "col-12 mb-3");
    			add_location(div27, file$5, 127, 32, 8433);
    			attr_dev(article0, "class", "p-0 shadow-radius-section shadow-section mb-3 bg-light");
    			add_location(article0, file$5, 75, 28, 3974);
    			attr_dev(img6, "class", "cu-image-com mr-1 ");
    			if (img6.src !== (img6_src_value = "image/afarine.jpg")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "alt", "");
    			add_location(img6, file$5, 141, 52, 9468);
    			attr_dev(div28, "class", "col-2 col-sm-1 col-md-2 col-lg-1 p-0 pt-1");
    			add_location(div28, file$5, 140, 48, 9359);
    			set_style(i12, "color", "#048af7");
    			attr_dev(i12, "class", "fas fa-check-circle");
    			add_location(i12, file$5, 145, 102, 9894);
    			attr_dev(a10, "href", "#");
    			add_location(a10, file$5, 145, 60, 9852);
    			add_location(h63, file$5, 145, 56, 9848);
    			attr_dev(i13, "class", "fas fa-clock");
    			add_location(i13, file$5, 146, 88, 10050);
    			attr_dev(span5, "class", "show-time-custome");
    			add_location(span5, file$5, 146, 56, 10018);
    			attr_dev(div29, "class", "cu-intro mt-2");
    			add_location(div29, file$5, 144, 52, 9764);
    			attr_dev(div30, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-3 mr-lg-4 justify-content-center");
    			add_location(div30, file$5, 143, 48, 9635);
    			attr_dev(div31, "class", "row ");
    			add_location(div31, file$5, 139, 44, 9292);
    			attr_dev(div32, "class", "col-11 col-md-11");
    			add_location(div32, file$5, 138, 40, 9216);
    			attr_dev(i14, "class", "fas fa-ellipsis-v ");
    			attr_dev(i14, "type", "button");
    			attr_dev(i14, "data-toggle", "dropdown");
    			add_location(i14, file$5, 152, 40, 10432);
    			attr_dev(i15, "class", "far fa-bookmark");
    			add_location(i15, file$5, 154, 101, 10686);
    			attr_dev(a11, "href", "#");
    			add_location(a11, file$5, 154, 89, 10674);
    			add_location(li5, file$5, 154, 44, 10629);
    			attr_dev(i16, "class", "fas fa-share-alt");
    			add_location(i16, file$5, 155, 60, 10803);
    			attr_dev(a12, "href", "#");
    			add_location(a12, file$5, 155, 48, 10791);
    			add_location(li6, file$5, 155, 44, 10787);
    			attr_dev(i17, "class", "fas fa-flag");
    			add_location(i17, file$5, 156, 60, 10920);
    			attr_dev(a13, "href", "#");
    			add_location(a13, file$5, 156, 48, 10908);
    			add_location(li7, file$5, 156, 44, 10904);
    			attr_dev(ul2, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul2, file$5, 153, 40, 10544);
    			attr_dev(div33, "class", "col-1 ml-0 pl-0 pr-4 dropdown");
    			add_location(div33, file$5, 151, 40, 10348);
    			attr_dev(div34, "class", "row justify-content-between p-2");
    			add_location(div34, file$5, 137, 36, 9130);
    			attr_dev(div35, "class", "col-12");
    			add_location(div35, file$5, 136, 32, 9073);
    			attr_dev(a14, "href", "#");
    			add_location(a14, file$5, 162, 80, 11280);
    			attr_dev(h32, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h32, file$5, 162, 36, 11236);
    			attr_dev(div36, "class", "col-12 p-0");
    			add_location(div36, file$5, 161, 32, 11175);
    			if (img7.src !== (img7_src_value = "image/28.jpg")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img7, "alt", "");
    			add_location(img7, file$5, 165, 36, 11521);
    			attr_dev(div37, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div37, file$5, 164, 32, 11427);
    			attr_dev(span6, "id", "dots");
    			add_location(span6, file$5, 171, 122, 12116);
    			attr_dev(span7, "id", "more");
    			add_location(span7, file$5, 171, 148, 12142);
    			attr_dev(span8, "id", "myBtn");
    			set_style(span8, "cursor", "pointer");
    			add_location(span8, file$5, 178, 36, 12861);
    			attr_dev(p1, "class", "col-12 mt-3 post-text");
    			add_location(p1, file$5, 168, 32, 11708);
    			attr_dev(button3, "id", "read-more");
    			attr_dev(button3, "class", "btn btn-sm btn-danger col-12 col-md-2 my-1 p-1 offset-0 offset-md-10");
    			add_location(button3, file$5, 183, 40, 13163);
    			attr_dev(a15, "href", "#");
    			add_location(a15, file$5, 182, 36, 13110);
    			attr_dev(div38, "class", "col-12 ");
    			add_location(div38, file$5, 181, 32, 13052);
    			attr_dev(hr1, "class", "col-11 mx-auto");
    			add_location(hr1, file$5, 186, 32, 13395);
    			attr_dev(img8, "class", "personal-img");
    			if (img8.src !== (img8_src_value = "image/1.jpeg")) attr_dev(img8, "src", img8_src_value);
    			attr_dev(img8, "alt", "");
    			add_location(img8, file$5, 189, 40, 13588);
    			attr_dev(span9, "class", "personal-name");
    			add_location(span9, file$5, 190, 40, 13681);
    			attr_dev(a16, "class", "a-clicked");
    			attr_dev(a16, "href", "#");
    			add_location(a16, file$5, 188, 36, 13517);
    			attr_dev(i18, "class", "fas fa-eye");
    			add_location(i18, file$5, 192, 60, 13848);
    			attr_dev(div39, "class", "view-count");
    			add_location(div39, file$5, 192, 36, 13824);
    			attr_dev(div40, "class", "col-12 mb-3");
    			add_location(div40, file$5, 187, 32, 13455);
    			attr_dev(article1, "class", "p-0 shadow-radius-section shadow-section mb-3 bg-light");
    			add_location(article1, file$5, 135, 28, 8968);
    			attr_dev(img9, "class", "cu-image-com mr-1 ");
    			if (img9.src !== (img9_src_value = "image/afarine.jpg")) attr_dev(img9, "src", img9_src_value);
    			attr_dev(img9, "alt", "");
    			add_location(img9, file$5, 201, 52, 14491);
    			attr_dev(div41, "class", "col-2 col-sm-1 col-md-2 col-lg-1 p-0 pt-1");
    			add_location(div41, file$5, 200, 48, 14382);
    			set_style(i19, "color", "#048af7");
    			attr_dev(i19, "class", "fas fa-check-circle");
    			add_location(i19, file$5, 205, 102, 14917);
    			attr_dev(a17, "href", "#");
    			add_location(a17, file$5, 205, 60, 14875);
    			add_location(h64, file$5, 205, 56, 14871);
    			attr_dev(i20, "class", "fas fa-clock");
    			add_location(i20, file$5, 206, 88, 15073);
    			attr_dev(span10, "class", "show-time-custome");
    			add_location(span10, file$5, 206, 56, 15041);
    			attr_dev(div42, "class", "cu-intro mt-2");
    			add_location(div42, file$5, 204, 52, 14787);
    			attr_dev(div43, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-3 mr-lg-4 justify-content-center");
    			add_location(div43, file$5, 203, 48, 14658);
    			attr_dev(div44, "class", "row ");
    			add_location(div44, file$5, 199, 44, 14315);
    			attr_dev(div45, "class", "col-11 col-md-11");
    			add_location(div45, file$5, 198, 40, 14239);
    			attr_dev(i21, "class", "fas fa-ellipsis-v ");
    			attr_dev(i21, "type", "button");
    			attr_dev(i21, "data-toggle", "dropdown");
    			add_location(i21, file$5, 212, 40, 15457);
    			attr_dev(i22, "class", "far fa-bookmark");
    			add_location(i22, file$5, 214, 101, 15711);
    			attr_dev(a18, "href", "#");
    			add_location(a18, file$5, 214, 89, 15699);
    			add_location(li8, file$5, 214, 44, 15654);
    			attr_dev(i23, "class", "fas fa-share-alt");
    			add_location(i23, file$5, 215, 60, 15828);
    			attr_dev(a19, "href", "#");
    			add_location(a19, file$5, 215, 48, 15816);
    			add_location(li9, file$5, 215, 44, 15812);
    			attr_dev(i24, "class", "fas fa-flag");
    			add_location(i24, file$5, 216, 60, 15945);
    			attr_dev(a20, "href", "#");
    			add_location(a20, file$5, 216, 48, 15933);
    			add_location(li10, file$5, 216, 44, 15929);
    			attr_dev(ul3, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul3, file$5, 213, 40, 15569);
    			attr_dev(div46, "class", "col-1 ml-0 pl-0 pr-4 dropdown");
    			add_location(div46, file$5, 211, 40, 15373);
    			attr_dev(div47, "class", "row justify-content-between p-2");
    			add_location(div47, file$5, 197, 36, 14153);
    			attr_dev(div48, "class", "col-12");
    			add_location(div48, file$5, 196, 32, 14096);
    			attr_dev(a21, "href", "#");
    			add_location(a21, file$5, 222, 80, 16305);
    			attr_dev(h33, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h33, file$5, 222, 36, 16261);
    			attr_dev(div49, "class", "col-12 p-0");
    			add_location(div49, file$5, 221, 32, 16200);
    			if (img10.src !== (img10_src_value = "20.jpg")) attr_dev(img10, "src", img10_src_value);
    			attr_dev(img10, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img10, "alt", "");
    			add_location(img10, file$5, 225, 36, 16527);
    			attr_dev(div50, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div50, file$5, 224, 32, 16433);
    			attr_dev(span11, "id", "dots");
    			add_location(span11, file$5, 231, 122, 17116);
    			attr_dev(span12, "id", "more");
    			add_location(span12, file$5, 231, 148, 17142);
    			attr_dev(span13, "id", "myBtn");
    			set_style(span13, "cursor", "pointer");
    			add_location(span13, file$5, 238, 36, 17861);
    			attr_dev(p2, "class", "col-12 mt-3 post-text");
    			add_location(p2, file$5, 228, 32, 16708);
    			attr_dev(button4, "id", "read-more");
    			attr_dev(button4, "class", "btn btn-sm btn-danger col-12 col-md-2 my-1 p-1 offset-0 offset-md-10");
    			add_location(button4, file$5, 243, 40, 18163);
    			attr_dev(a22, "href", "#");
    			add_location(a22, file$5, 242, 36, 18110);
    			attr_dev(div51, "class", "col-12 ");
    			add_location(div51, file$5, 241, 32, 18052);
    			attr_dev(hr2, "class", "col-11 mx-auto");
    			add_location(hr2, file$5, 246, 32, 18395);
    			attr_dev(img11, "class", "personal-img");
    			if (img11.src !== (img11_src_value = "image/4.jpeg")) attr_dev(img11, "src", img11_src_value);
    			attr_dev(img11, "alt", "");
    			add_location(img11, file$5, 249, 40, 18588);
    			attr_dev(span14, "class", "personal-name");
    			add_location(span14, file$5, 250, 40, 18681);
    			attr_dev(a23, "class", "a-clicked");
    			attr_dev(a23, "href", "#");
    			add_location(a23, file$5, 248, 36, 18517);
    			attr_dev(i25, "class", "fas fa-eye");
    			add_location(i25, file$5, 252, 60, 18842);
    			attr_dev(div52, "class", "view-count");
    			add_location(div52, file$5, 252, 36, 18818);
    			attr_dev(div53, "class", "col-12 mb-3");
    			add_location(div53, file$5, 247, 32, 18455);
    			attr_dev(article2, "class", "p-0 shadow-radius-section shadow-section mb-3 bg-light");
    			add_location(article2, file$5, 195, 28, 13991);
    			attr_dev(div54, "class", "col-12 p-0 main-article bg-light");
    			add_location(div54, file$5, 74, 24, 3899);
    			attr_dev(section, "class", "row mx-0 mt-3 mr-0 pt-0  ");
    			add_location(section, file$5, 73, 20, 3831);
    			attr_dev(aside1, "class", "col-12 col-md-9 order-first justify-content-between order-md-0 mx-0 ");
    			add_location(aside1, file$5, 72, 16, 3726);
    			attr_dev(img12, "class", "company-img ml-3");
    			if (img12.src !== (img12_src_value = "image/afarine.jpg")) attr_dev(img12, "src", img12_src_value);
    			attr_dev(img12, "alt", "");
    			add_location(img12, file$5, 263, 28, 19331);
    			attr_dev(div55, "class", "col-10 ml-2 mt-5 mb-3 ");
    			add_location(div55, file$5, 262, 24, 19266);
    			attr_dev(h34, "class", "col-12");
    			add_location(h34, file$5, 265, 24, 19448);
    			attr_dev(h65, "class", "col-12");
    			add_location(h65, file$5, 268, 24, 19557);
    			attr_dev(div56, "class", "row px-0 text-center shadow-radius-section bg-light ");
    			add_location(div56, file$5, 261, 20, 19175);
    			attr_dev(aside2, "class", "col-12 col-md-3 mt-3 ");
    			add_location(aside2, file$5, 260, 16, 19117);
    			attr_dev(div57, "class", "row");
    			add_location(div57, file$5, 71, 12, 3692);
    			attr_dev(aside3, "class", "col-12 col-md-8  ");
    			add_location(aside3, file$5, 37, 8, 1155);
    			attr_dev(div58, "class", "row justify-content-center mx-0");
    			add_location(div58, file$5, 22, 4, 572);
    			attr_dev(main, "class", "container-fluid pin-parent ");
    			add_location(main, file$5, 21, 0, 508);
    			add_location(br0, file$5, 278, 0, 19767);
    			attr_dev(hr3, "class", "col-10 offset-1");
    			add_location(hr3, file$5, 278, 4, 19771);
    			add_location(br1, file$5, 278, 32, 19799);
    			add_location(br2, file$5, 278, 36, 19803);
    			add_location(br3, file$5, 278, 40, 19807);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
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
    			append_dev(div58, aside3);
    			append_dev(aside3, div14);
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
    			append_dev(button0, t10);
    			append_dev(button0, i2);
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
    			append_dev(aside3, t17);
    			append_dev(aside3, div57);
    			append_dev(div57, aside1);
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
    			append_dev(a3, t19);
    			append_dev(a3, i5);
    			append_dev(div16, t20);
    			append_dev(div16, span0);
    			append_dev(span0, i6);
    			append_dev(span0, t21);
    			append_dev(div21, t22);
    			append_dev(div21, div20);
    			append_dev(div20, i7);
    			append_dev(div20, t23);
    			append_dev(div20, ul1);
    			append_dev(ul1, li2);
    			append_dev(li2, a4);
    			append_dev(a4, i8);
    			append_dev(a4, t24);
    			append_dev(ul1, t25);
    			append_dev(ul1, li3);
    			append_dev(li3, a5);
    			append_dev(a5, i9);
    			append_dev(a5, t26);
    			append_dev(ul1, t27);
    			append_dev(ul1, li4);
    			append_dev(li4, a6);
    			append_dev(a6, i10);
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
    			append_dev(p0, t33);
    			append_dev(p0, span1);
    			append_dev(p0, span2);
    			append_dev(p0, t36);
    			append_dev(p0, span3);
    			append_dev(article0, t38);
    			append_dev(article0, div25);
    			append_dev(div25, a8);
    			append_dev(a8, button2);
    			append_dev(article0, t40);
    			append_dev(article0, hr0);
    			append_dev(article0, t41);
    			append_dev(article0, div27);
    			append_dev(div27, a9);
    			append_dev(a9, img5);
    			append_dev(a9, t42);
    			append_dev(a9, span4);
    			append_dev(a9, t44);
    			append_dev(div27, t45);
    			append_dev(div27, div26);
    			append_dev(div26, i11);
    			append_dev(div26, t46);
    			append_dev(div54, t47);
    			append_dev(div54, article1);
    			append_dev(article1, div35);
    			append_dev(div35, div34);
    			append_dev(div34, div32);
    			append_dev(div32, div31);
    			append_dev(div31, div28);
    			append_dev(div28, img6);
    			append_dev(div31, t48);
    			append_dev(div31, div30);
    			append_dev(div30, div29);
    			append_dev(div29, h63);
    			append_dev(h63, a10);
    			append_dev(a10, t49);
    			append_dev(a10, i12);
    			append_dev(div29, t50);
    			append_dev(div29, span5);
    			append_dev(span5, i13);
    			append_dev(span5, t51);
    			append_dev(div34, t52);
    			append_dev(div34, div33);
    			append_dev(div33, i14);
    			append_dev(div33, t53);
    			append_dev(div33, ul2);
    			append_dev(ul2, li5);
    			append_dev(li5, a11);
    			append_dev(a11, i15);
    			append_dev(a11, t54);
    			append_dev(ul2, t55);
    			append_dev(ul2, li6);
    			append_dev(li6, a12);
    			append_dev(a12, i16);
    			append_dev(a12, t56);
    			append_dev(ul2, t57);
    			append_dev(ul2, li7);
    			append_dev(li7, a13);
    			append_dev(a13, i17);
    			append_dev(a13, t58);
    			append_dev(article1, t59);
    			append_dev(article1, div36);
    			append_dev(div36, h32);
    			append_dev(h32, a14);
    			append_dev(article1, t61);
    			append_dev(article1, div37);
    			append_dev(div37, img7);
    			append_dev(article1, t62);
    			append_dev(article1, p1);
    			append_dev(p1, t63);
    			append_dev(p1, span6);
    			append_dev(p1, span7);
    			append_dev(p1, t66);
    			append_dev(p1, span8);
    			append_dev(article1, t68);
    			append_dev(article1, div38);
    			append_dev(div38, a15);
    			append_dev(a15, button3);
    			append_dev(article1, t70);
    			append_dev(article1, hr1);
    			append_dev(article1, t71);
    			append_dev(article1, div40);
    			append_dev(div40, a16);
    			append_dev(a16, img8);
    			append_dev(a16, t72);
    			append_dev(a16, span9);
    			append_dev(a16, t74);
    			append_dev(div40, t75);
    			append_dev(div40, div39);
    			append_dev(div39, i18);
    			append_dev(div39, t76);
    			append_dev(div54, t77);
    			append_dev(div54, article2);
    			append_dev(article2, div48);
    			append_dev(div48, div47);
    			append_dev(div47, div45);
    			append_dev(div45, div44);
    			append_dev(div44, div41);
    			append_dev(div41, img9);
    			append_dev(div44, t78);
    			append_dev(div44, div43);
    			append_dev(div43, div42);
    			append_dev(div42, h64);
    			append_dev(h64, a17);
    			append_dev(a17, t79);
    			append_dev(a17, i19);
    			append_dev(div42, t80);
    			append_dev(div42, span10);
    			append_dev(span10, i20);
    			append_dev(span10, t81);
    			append_dev(div47, t82);
    			append_dev(div47, div46);
    			append_dev(div46, i21);
    			append_dev(div46, t83);
    			append_dev(div46, ul3);
    			append_dev(ul3, li8);
    			append_dev(li8, a18);
    			append_dev(a18, i22);
    			append_dev(a18, t84);
    			append_dev(ul3, t85);
    			append_dev(ul3, li9);
    			append_dev(li9, a19);
    			append_dev(a19, i23);
    			append_dev(a19, t86);
    			append_dev(ul3, t87);
    			append_dev(ul3, li10);
    			append_dev(li10, a20);
    			append_dev(a20, i24);
    			append_dev(a20, t88);
    			append_dev(article2, t89);
    			append_dev(article2, div49);
    			append_dev(div49, h33);
    			append_dev(h33, a21);
    			append_dev(article2, t91);
    			append_dev(article2, div50);
    			append_dev(div50, img10);
    			append_dev(article2, t92);
    			append_dev(article2, p2);
    			append_dev(p2, t93);
    			append_dev(p2, span11);
    			append_dev(p2, span12);
    			append_dev(p2, t96);
    			append_dev(p2, span13);
    			append_dev(article2, t98);
    			append_dev(article2, div51);
    			append_dev(div51, a22);
    			append_dev(a22, button4);
    			append_dev(article2, t100);
    			append_dev(article2, hr2);
    			append_dev(article2, t101);
    			append_dev(article2, div53);
    			append_dev(div53, a23);
    			append_dev(a23, img11);
    			append_dev(a23, t102);
    			append_dev(a23, span14);
    			append_dev(a23, t104);
    			append_dev(div53, t105);
    			append_dev(div53, div52);
    			append_dev(div52, i25);
    			append_dev(div52, t106);
    			append_dev(div57, t107);
    			append_dev(div57, aside2);
    			append_dev(aside2, div56);
    			append_dev(div56, div55);
    			append_dev(div55, img12);
    			append_dev(div56, t108);
    			append_dev(div56, h34);
    			append_dev(div56, t110);
    			append_dev(div56, h65);
    			insert_dev(target, t112, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, hr3, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, br2, anchor);
    			insert_dev(target, br3, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "scroll", () => {
    						scrolling = true;
    						clearTimeout(scrolling_timeout);
    						scrolling_timeout = setTimeout(clear_scrolling, 100);
    						/*onwindowscroll*/ ctx[2]();
    					}),
    					listen_dev(span3, "click", myFunction, false, false, false),
    					listen_dev(span8, "click", myFunction, false, false, false),
    					listen_dev(span13, "click", myFunction, false, false, false)
    				];

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
    			if (detaching) detach_dev(t112);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(hr3);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(br2);
    			if (detaching) detach_dev(br3);
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
    	validate_slots("Blog", slots, []);
    	let { url = "" } = $$props;
    	let { y } = $$props;
    	const writable_props = ["url", "y"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Blog> was created with unknown prop '${key}'`);
    	});

    	function onwindowscroll() {
    		$$invalidate(0, y = window.pageYOffset);
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
    		circIn,
    		Router,
    		Link,
    		Route,
    		about: About,
    		url,
    		y
    	});

    	$$self.$inject_state = $$props => {
    		if ("url" in $$props) $$invalidate(1, url = $$props.url);
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [y, url, onwindowscroll];
    }

    class Blog extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { url: 1, y: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Blog",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*y*/ ctx[0] === undefined && !("y" in props)) {
    			console.warn("<Blog> was created without expected prop 'y'");
    		}
    	}

    	get url() {
    		throw new Error("<Blog>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Blog>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get y() {
    		throw new Error("<Blog>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<Blog>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/pages/home.svelte generated by Svelte v3.38.3 */
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
    	let t42;
    	let span4;
    	let span5;
    	let t45;
    	let span6;
    	let t47;
    	let div16;
    	let a11;
    	let button0;
    	let t49;
    	let hr0;
    	let t50;
    	let div18;
    	let a12;
    	let img8;
    	let img8_src_value;
    	let t51;
    	let span7;
    	let t53;
    	let t54;
    	let div17;
    	let i12;
    	let t55;
    	let t56;
    	let article4;
    	let div26;
    	let div25;
    	let div23;
    	let div22;
    	let div19;
    	let img9;
    	let img9_src_value;
    	let t57;
    	let div21;
    	let div20;
    	let h61;
    	let a13;
    	let t58;
    	let i13;
    	let t59;
    	let span8;
    	let i14;
    	let t60;
    	let t61;
    	let div24;
    	let i15;
    	let t62;
    	let ul1;
    	let li3;
    	let a14;
    	let i16;
    	let t63;
    	let t64;
    	let li4;
    	let a15;
    	let i17;
    	let t65;
    	let t66;
    	let li5;
    	let a16;
    	let i18;
    	let t67;
    	let t68;
    	let div27;
    	let h31;
    	let a17;
    	let t70;
    	let div28;
    	let img10;
    	let img10_src_value;
    	let t71;
    	let p1;
    	let t72;
    	let span9;
    	let span10;
    	let t75;
    	let span11;
    	let t77;
    	let div29;
    	let a18;
    	let button1;
    	let t79;
    	let hr1;
    	let t80;
    	let div31;
    	let a19;
    	let img11;
    	let img11_src_value;
    	let t81;
    	let span12;
    	let t83;
    	let t84;
    	let div30;
    	let i19;
    	let t85;
    	let t86;
    	let article5;
    	let div39;
    	let div38;
    	let div36;
    	let div35;
    	let div32;
    	let img12;
    	let img12_src_value;
    	let t87;
    	let div34;
    	let div33;
    	let h62;
    	let a20;
    	let t88;
    	let i20;
    	let t89;
    	let span13;
    	let i21;
    	let t90;
    	let t91;
    	let div37;
    	let i22;
    	let t92;
    	let ul2;
    	let li6;
    	let a21;
    	let i23;
    	let t93;
    	let t94;
    	let li7;
    	let a22;
    	let i24;
    	let t95;
    	let t96;
    	let li8;
    	let a23;
    	let i25;
    	let t97;
    	let t98;
    	let div40;
    	let h32;
    	let a24;
    	let t100;
    	let div41;
    	let img13;
    	let img13_src_value;
    	let t101;
    	let p2;
    	let t102;
    	let span14;
    	let span15;
    	let t105;
    	let span16;
    	let t107;
    	let div42;
    	let a25;
    	let button2;
    	let t109;
    	let hr2;
    	let t110;
    	let div44;
    	let a26;
    	let img14;
    	let img14_src_value;
    	let t111;
    	let span17;
    	let t113;
    	let t114;
    	let div43;
    	let i26;
    	let t115;
    	let t116;
    	let aside2;
    	let main_transition;
    	let t118;
    	let br0;
    	let hr3;
    	let br1;
    	let br2;
    	let br3;
    	let current;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowscroll*/ ctx[2]);

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
    			t42 = text("طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                             صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                             برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید ");
    			span4 = element("span");
    			span4.textContent = "...";
    			span5 = element("span");
    			span5.textContent = "طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                            برای پر کردن صفحه و ارایه اولیه شکل \n                            ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                            تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                            صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                            تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.";
    			t45 = space();
    			span6 = element("span");
    			span6.textContent = "بیشتر بخوانید";
    			t47 = space();
    			div16 = element("div");
    			a11 = element("a");
    			button0 = element("button");
    			button0.textContent = "ادامه مطلب";
    			t49 = space();
    			hr0 = element("hr");
    			t50 = space();
    			div18 = element("div");
    			a12 = element("a");
    			img8 = element("img");
    			t51 = space();
    			span7 = element("span");
    			span7.textContent = "مسعودآقایی ساداتی";
    			t53 = text("  ");
    			t54 = space();
    			div17 = element("div");
    			i12 = element("i");
    			t55 = text(" ۵۶");
    			t56 = space();
    			article4 = element("article");
    			div26 = element("div");
    			div25 = element("div");
    			div23 = element("div");
    			div22 = element("div");
    			div19 = element("div");
    			img9 = element("img");
    			t57 = space();
    			div21 = element("div");
    			div20 = element("div");
    			h61 = element("h6");
    			a13 = element("a");
    			t58 = text("مرکز رشد و نواوری آفرینه ");
    			i13 = element("i");
    			t59 = space();
    			span8 = element("span");
    			i14 = element("i");
    			t60 = text(" ۸ روز قبل");
    			t61 = space();
    			div24 = element("div");
    			i15 = element("i");
    			t62 = space();
    			ul1 = element("ul");
    			li3 = element("li");
    			a14 = element("a");
    			i16 = element("i");
    			t63 = text(" ذخیره کردن پست");
    			t64 = space();
    			li4 = element("li");
    			a15 = element("a");
    			i17 = element("i");
    			t65 = text(" کپی کردن لینک");
    			t66 = space();
    			li5 = element("li");
    			a16 = element("a");
    			i18 = element("i");
    			t67 = text(" گزارش دادن");
    			t68 = space();
    			div27 = element("div");
    			h31 = element("h3");
    			a17 = element("a");
    			a17.textContent = "نگاهی اجمالی به آخرین دستاوردهای شبکه اجتماعی فیس بوک";
    			t70 = space();
    			div28 = element("div");
    			img10 = element("img");
    			t71 = space();
    			p1 = element("p");
    			t72 = text("طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                             صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                             برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید ");
    			span9 = element("span");
    			span9.textContent = "...";
    			span10 = element("span");
    			span10.textContent = "طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                            برای پر کردن صفحه و ارایه اولیه شکل \n                            ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                            تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                            صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                            تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.";
    			t75 = space();
    			span11 = element("span");
    			span11.textContent = "بیشتر بخوانید";
    			t77 = space();
    			div29 = element("div");
    			a18 = element("a");
    			button1 = element("button");
    			button1.textContent = "ادامه مطلب";
    			t79 = space();
    			hr1 = element("hr");
    			t80 = space();
    			div31 = element("div");
    			a19 = element("a");
    			img11 = element("img");
    			t81 = space();
    			span12 = element("span");
    			span12.textContent = "مسعودآقایی ساداتی";
    			t83 = text("  ");
    			t84 = space();
    			div30 = element("div");
    			i19 = element("i");
    			t85 = text(" ۱۴۲");
    			t86 = space();
    			article5 = element("article");
    			div39 = element("div");
    			div38 = element("div");
    			div36 = element("div");
    			div35 = element("div");
    			div32 = element("div");
    			img12 = element("img");
    			t87 = space();
    			div34 = element("div");
    			div33 = element("div");
    			h62 = element("h6");
    			a20 = element("a");
    			t88 = text("مرکز رشد و نواوری آفرینه ");
    			i20 = element("i");
    			t89 = space();
    			span13 = element("span");
    			i21 = element("i");
    			t90 = text(" ۳ دقیقه قبل");
    			t91 = space();
    			div37 = element("div");
    			i22 = element("i");
    			t92 = space();
    			ul2 = element("ul");
    			li6 = element("li");
    			a21 = element("a");
    			i23 = element("i");
    			t93 = text(" ذخیره کردن پست");
    			t94 = space();
    			li7 = element("li");
    			a22 = element("a");
    			i24 = element("i");
    			t95 = text(" کپی کردن لینک");
    			t96 = space();
    			li8 = element("li");
    			a23 = element("a");
    			i25 = element("i");
    			t97 = text(" گزارش دادن");
    			t98 = space();
    			div40 = element("div");
    			h32 = element("h3");
    			a24 = element("a");
    			a24.textContent = "راه های مدیریت کسب و کار الکترونیکی";
    			t100 = space();
    			div41 = element("div");
    			img13 = element("img");
    			t101 = space();
    			p2 = element("p");
    			t102 = text("طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                             صفحه‌آرایی و طراحی گرافیک گفته می‌شود. طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                             برای پر کردن صفحه و ارایه اولیه شکل ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید ");
    			span14 = element("span");
    			span14.textContent = "...";
    			span15 = element("span");
    			span15.textContent = "طراح گرافیک از این متن به عنوان عنصری از ترکیب بندی \n                            برای پر کردن صفحه و ارایه اولیه شکل \n                            ظاهری و کلی طرح سفارش گرفته شده استفاده می نماید،\n                            تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد. طرح‌نما یا لورم ایپسوم(به انگلیسی: Lorem ipsum) به متنی آزمایشی و بی‌معنی در صنعت چاپ،\n                            صفحه‌آرایی و طراحی گرافیک گفته می‌شود،\n                            تا از نظر گرافیکی نشانگر چگونگی نوع و اندازه فونت و ظاهر متن باشد.";
    			t105 = space();
    			span16 = element("span");
    			span16.textContent = "بیشتر بخوانید";
    			t107 = space();
    			div42 = element("div");
    			a25 = element("a");
    			button2 = element("button");
    			button2.textContent = "ادامه مطلب";
    			t109 = space();
    			hr2 = element("hr");
    			t110 = space();
    			div44 = element("div");
    			a26 = element("a");
    			img14 = element("img");
    			t111 = space();
    			span17 = element("span");
    			span17.textContent = "مجتبی اکبری";
    			t113 = text("  ");
    			t114 = space();
    			div43 = element("div");
    			i26 = element("i");
    			t115 = text(" ۱۲");
    			t116 = space();
    			aside2 = element("aside");
    			aside2.textContent = "hello";
    			t118 = space();
    			br0 = element("br");
    			hr3 = element("hr");
    			br1 = element("br");
    			br2 = element("br");
    			br3 = element("br");
    			document.title = "\n        اینولینکس\n    ";
    			attr_dev(aside0, "class", "col-12 col-md-2  mx-1 mt-5 mt-md-0 bg-light shadow-radius-section");
    			add_location(aside0, file$4, 22, 8, 624);
    			attr_dev(img0, "class", "image-pin-top");
    			if (img0.src !== (img0_src_value = "image/30.jpg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$4, 27, 24, 1046);
    			add_location(h50, file$4, 29, 28, 1195);
    			attr_dev(a0, "class", "w-100 content-pin-top");
    			attr_dev(a0, "href", "#");
    			add_location(a0, file$4, 28, 24, 1124);
    			if (img1.src !== (img1_src_value = "/image/26.jpeg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "class", "mag-img-top");
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$4, 32, 28, 1342);
    			attr_dev(a1, "href", "#");
    			add_location(a1, file$4, 31, 24, 1301);
    			set_style(i0, "color", "mediumspringgreen");
    			attr_dev(i0, "class", "fas fa-check-circle");
    			add_location(i0, file$4, 35, 60, 1543);
    			add_location(span0, file$4, 35, 28, 1511);
    			attr_dev(i1, "class", "fas fa-clock");
    			add_location(i1, file$4, 35, 144, 1627);
    			attr_dev(div0, "class", "author-time-pin-top");
    			add_location(div0, file$4, 34, 24, 1449);
    			attr_dev(article0, "class", "col-12 bg-danger mb-md-4 first-article-main");
    			add_location(article0, file$4, 26, 20, 960);
    			attr_dev(div1, "class", "col-12 mb-4 my-md-0");
    			add_location(div1, file$4, 25, 16, 906);
    			attr_dev(img2, "class", "image-pin w-100");
    			if (img2.src !== (img2_src_value = "image/28.jpg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$4, 41, 24, 1896);
    			add_location(h51, file$4, 43, 28, 2043);
    			attr_dev(a2, "class", "w-100 content-pin");
    			attr_dev(a2, "href", "#");
    			add_location(a2, file$4, 42, 24, 1976);
    			if (img3.src !== (img3_src_value = "/image/27.png")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "class", "mag-img");
    			attr_dev(img3, "alt", "");
    			add_location(img3, file$4, 46, 28, 2190);
    			attr_dev(a3, "href", "#");
    			add_location(a3, file$4, 45, 24, 2149);
    			set_style(i2, "color", "mediumspringgreen");
    			attr_dev(i2, "class", "fas fa-check-circle");
    			add_location(i2, file$4, 49, 42, 2364);
    			add_location(span1, file$4, 49, 28, 2350);
    			attr_dev(i3, "class", "fas fa-clock");
    			add_location(i3, file$4, 49, 126, 2448);
    			attr_dev(div2, "class", "author-time-pin");
    			add_location(div2, file$4, 48, 24, 2292);
    			attr_dev(article1, "class", "col-12");
    			add_location(article1, file$4, 40, 20, 1847);
    			attr_dev(div3, "class", "col-12 col-xl-6 mb-4 my-md-0 pin-article-main");
    			add_location(div3, file$4, 39, 16, 1767);
    			attr_dev(img4, "class", "image-pin w-100");
    			if (img4.src !== (img4_src_value = "20.jpg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "alt", "");
    			add_location(img4, file$4, 55, 24, 2726);
    			add_location(h52, file$4, 57, 28, 2867);
    			attr_dev(a4, "class", "w-100 content-pin");
    			attr_dev(a4, "href", "#");
    			add_location(a4, file$4, 56, 24, 2800);
    			if (img5.src !== (img5_src_value = "/image/25.jpg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "class", "mag-img");
    			attr_dev(img5, "alt", "");
    			add_location(img5, file$4, 60, 28, 2993);
    			attr_dev(a5, "href", "#");
    			add_location(a5, file$4, 59, 24, 2952);
    			set_style(i4, "color", "mediumspringgreen");
    			attr_dev(i4, "class", "fas fa-check-circle");
    			add_location(i4, file$4, 63, 49, 3174);
    			add_location(span2, file$4, 63, 28, 3153);
    			attr_dev(i5, "class", "fas fa-clock");
    			add_location(i5, file$4, 63, 133, 3258);
    			attr_dev(div4, "class", "author-time-pin");
    			add_location(div4, file$4, 62, 24, 3095);
    			attr_dev(article2, "class", "col-12");
    			add_location(article2, file$4, 54, 20, 2677);
    			attr_dev(div5, "class", "col-12 col-xl-6 mb-4 mt-lg-0 mt-md-4  pin-article-main");
    			add_location(div5, file$4, 53, 16, 2588);
    			attr_dev(section0, "class", "row justify-content-md-center mx-0 pt-3 bg-light shadow-radius-section");
    			add_location(section0, file$4, 24, 12, 800);
    			attr_dev(img6, "class", "cu-image-com mr-1 ");
    			if (img6.src !== (img6_src_value = "image/afarine.jpg")) attr_dev(img6, "src", img6_src_value);
    			attr_dev(img6, "alt", "");
    			add_location(img6, file$4, 76, 44, 3986);
    			attr_dev(div6, "class", "col-2 col-sm-1 col-md-2 col-lg-1 p-0 pt-1");
    			add_location(div6, file$4, 75, 40, 3885);
    			set_style(i6, "color", "#048af7");
    			attr_dev(i6, "class", "fas fa-check-circle");
    			add_location(i6, file$4, 80, 94, 4380);
    			attr_dev(a6, "href", "#");
    			add_location(a6, file$4, 80, 52, 4338);
    			add_location(h60, file$4, 80, 48, 4334);
    			attr_dev(i7, "class", "fas fa-clock");
    			add_location(i7, file$4, 81, 80, 4528);
    			attr_dev(span3, "class", "show-time-custome");
    			add_location(span3, file$4, 81, 48, 4496);
    			attr_dev(div7, "class", "cu-intro mt-2");
    			add_location(div7, file$4, 79, 44, 4258);
    			attr_dev(div8, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-3 mr-lg-4 justify-content-center");
    			add_location(div8, file$4, 78, 40, 4137);
    			attr_dev(div9, "class", "row ");
    			add_location(div9, file$4, 74, 36, 3826);
    			attr_dev(div10, "class", "col-11 col-md-11");
    			add_location(div10, file$4, 73, 32, 3758);
    			attr_dev(i8, "class", "fas fa-ellipsis-v ");
    			attr_dev(i8, "type", "button");
    			attr_dev(i8, "data-toggle", "dropdown");
    			add_location(i8, file$4, 87, 32, 4864);
    			attr_dev(i9, "class", "far fa-bookmark");
    			add_location(i9, file$4, 89, 93, 5102);
    			attr_dev(a7, "href", "#");
    			add_location(a7, file$4, 89, 81, 5090);
    			add_location(li0, file$4, 89, 36, 5045);
    			attr_dev(i10, "class", "fas fa-share-alt");
    			add_location(i10, file$4, 90, 52, 5211);
    			attr_dev(a8, "href", "#");
    			add_location(a8, file$4, 90, 40, 5199);
    			add_location(li1, file$4, 90, 36, 5195);
    			attr_dev(i11, "class", "fas fa-flag");
    			add_location(i11, file$4, 91, 52, 5320);
    			attr_dev(a9, "href", "#");
    			add_location(a9, file$4, 91, 40, 5308);
    			add_location(li2, file$4, 91, 36, 5304);
    			attr_dev(ul0, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul0, file$4, 88, 32, 4968);
    			attr_dev(div11, "class", "col-1 ml-0 pl-0 pr-4 dropdown");
    			add_location(div11, file$4, 86, 32, 4788);
    			attr_dev(div12, "class", "row justify-content-between p-2");
    			add_location(div12, file$4, 72, 28, 3680);
    			attr_dev(div13, "class", "col-12");
    			add_location(div13, file$4, 71, 24, 3631);
    			attr_dev(a10, "href", "#");
    			add_location(a10, file$4, 97, 72, 5632);
    			attr_dev(h30, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h30, file$4, 97, 28, 5588);
    			attr_dev(div14, "class", "col-12 p-0");
    			add_location(div14, file$4, 96, 24, 5535);
    			if (img7.src !== (img7_src_value = "image/30.jpg")) attr_dev(img7, "src", img7_src_value);
    			attr_dev(img7, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img7, "alt", "");
    			add_location(img7, file$4, 100, 28, 5817);
    			attr_dev(div15, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div15, file$4, 99, 24, 5731);
    			attr_dev(span4, "id", "dots");
    			add_location(span4, file$4, 106, 114, 6364);
    			attr_dev(span5, "id", "more");
    			add_location(span5, file$4, 106, 140, 6390);
    			attr_dev(span6, "id", "myBtn");
    			set_style(span6, "cursor", "pointer");
    			add_location(span6, file$4, 113, 28, 7053);
    			attr_dev(p0, "class", "col-12 mt-3 post-text");
    			add_location(p0, file$4, 103, 24, 5980);
    			attr_dev(button0, "id", "read-more");
    			attr_dev(button0, "class", "btn btn-sm btn-danger col-12 col-md-2 my-1 p-1 offset-0 offset-md-10");
    			add_location(button0, file$4, 118, 32, 7315);
    			attr_dev(a11, "href", "#");
    			add_location(a11, file$4, 117, 28, 7270);
    			attr_dev(div16, "class", "col-12 ");
    			add_location(div16, file$4, 116, 24, 7220);
    			attr_dev(hr0, "class", "col-11 mx-auto");
    			add_location(hr0, file$4, 121, 24, 7523);
    			attr_dev(img8, "class", "personal-img");
    			if (img8.src !== (img8_src_value = "image/1.jpeg")) attr_dev(img8, "src", img8_src_value);
    			attr_dev(img8, "alt", "");
    			add_location(img8, file$4, 124, 32, 7692);
    			attr_dev(span7, "class", "personal-name");
    			add_location(span7, file$4, 125, 32, 7777);
    			attr_dev(a12, "class", "a-clicked");
    			attr_dev(a12, "href", "#");
    			add_location(a12, file$4, 123, 28, 7629);
    			attr_dev(i12, "class", "fas fa-eye");
    			add_location(i12, file$4, 127, 52, 7928);
    			attr_dev(div17, "class", "view-count");
    			add_location(div17, file$4, 127, 28, 7904);
    			attr_dev(div18, "class", "col-12 mb-3");
    			add_location(div18, file$4, 122, 24, 7575);
    			attr_dev(article3, "class", "p-0 shadow-radius-section shadow-section mb-3");
    			add_location(article3, file$4, 70, 20, 3543);
    			attr_dev(img9, "class", "cu-image-com mr-1 ");
    			if (img9.src !== (img9_src_value = "image/afarine.jpg")) attr_dev(img9, "src", img9_src_value);
    			attr_dev(img9, "alt", "");
    			add_location(img9, file$4, 136, 44, 8489);
    			attr_dev(div19, "class", "col-2 col-sm-1 col-md-2 col-lg-1 p-0 pt-1");
    			add_location(div19, file$4, 135, 40, 8388);
    			set_style(i13, "color", "#048af7");
    			attr_dev(i13, "class", "fas fa-check-circle");
    			add_location(i13, file$4, 140, 94, 8883);
    			attr_dev(a13, "href", "#");
    			add_location(a13, file$4, 140, 52, 8841);
    			add_location(h61, file$4, 140, 48, 8837);
    			attr_dev(i14, "class", "fas fa-clock");
    			add_location(i14, file$4, 141, 80, 9031);
    			attr_dev(span8, "class", "show-time-custome");
    			add_location(span8, file$4, 141, 48, 8999);
    			attr_dev(div20, "class", "cu-intro mt-2");
    			add_location(div20, file$4, 139, 44, 8761);
    			attr_dev(div21, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-3 mr-lg-4 justify-content-center");
    			add_location(div21, file$4, 138, 40, 8640);
    			attr_dev(div22, "class", "row ");
    			add_location(div22, file$4, 134, 36, 8329);
    			attr_dev(div23, "class", "col-11 col-md-11");
    			add_location(div23, file$4, 133, 32, 8261);
    			attr_dev(i15, "class", "fas fa-ellipsis-v ");
    			attr_dev(i15, "type", "button");
    			attr_dev(i15, "data-toggle", "dropdown");
    			add_location(i15, file$4, 147, 32, 9365);
    			attr_dev(i16, "class", "far fa-bookmark");
    			add_location(i16, file$4, 149, 93, 9603);
    			attr_dev(a14, "href", "#");
    			add_location(a14, file$4, 149, 81, 9591);
    			add_location(li3, file$4, 149, 36, 9546);
    			attr_dev(i17, "class", "fas fa-share-alt");
    			add_location(i17, file$4, 150, 52, 9712);
    			attr_dev(a15, "href", "#");
    			add_location(a15, file$4, 150, 40, 9700);
    			add_location(li4, file$4, 150, 36, 9696);
    			attr_dev(i18, "class", "fas fa-flag");
    			add_location(i18, file$4, 151, 52, 9821);
    			attr_dev(a16, "href", "#");
    			add_location(a16, file$4, 151, 40, 9809);
    			add_location(li5, file$4, 151, 36, 9805);
    			attr_dev(ul1, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul1, file$4, 148, 32, 9469);
    			attr_dev(div24, "class", "col-1 ml-0 pl-0 pr-4 dropdown");
    			add_location(div24, file$4, 146, 32, 9289);
    			attr_dev(div25, "class", "row justify-content-between p-2");
    			add_location(div25, file$4, 132, 28, 8183);
    			attr_dev(div26, "class", "col-12");
    			add_location(div26, file$4, 131, 24, 8134);
    			attr_dev(a17, "href", "#");
    			add_location(a17, file$4, 157, 72, 10133);
    			attr_dev(h31, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h31, file$4, 157, 28, 10089);
    			attr_dev(div27, "class", "col-12 p-0");
    			add_location(div27, file$4, 156, 24, 10036);
    			if (img10.src !== (img10_src_value = "image/28.jpg")) attr_dev(img10, "src", img10_src_value);
    			attr_dev(img10, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img10, "alt", "");
    			add_location(img10, file$4, 160, 28, 10350);
    			attr_dev(div28, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div28, file$4, 159, 24, 10264);
    			attr_dev(span9, "id", "dots");
    			add_location(span9, file$4, 166, 114, 10897);
    			attr_dev(span10, "id", "more");
    			add_location(span10, file$4, 166, 140, 10923);
    			attr_dev(span11, "id", "myBtn");
    			set_style(span11, "cursor", "pointer");
    			add_location(span11, file$4, 173, 28, 11586);
    			attr_dev(p1, "class", "col-12 mt-3 post-text");
    			add_location(p1, file$4, 163, 24, 10513);
    			attr_dev(button1, "id", "read-more");
    			attr_dev(button1, "class", "btn btn-sm btn-danger col-12 col-md-2 my-1 p-1 offset-0 offset-md-10");
    			add_location(button1, file$4, 178, 32, 11848);
    			attr_dev(a18, "href", "#");
    			add_location(a18, file$4, 177, 28, 11803);
    			attr_dev(div29, "class", "col-12 ");
    			add_location(div29, file$4, 176, 24, 11753);
    			attr_dev(hr1, "class", "col-11 mx-auto");
    			add_location(hr1, file$4, 181, 24, 12056);
    			attr_dev(img11, "class", "personal-img");
    			if (img11.src !== (img11_src_value = "image/1.jpeg")) attr_dev(img11, "src", img11_src_value);
    			attr_dev(img11, "alt", "");
    			add_location(img11, file$4, 184, 32, 12225);
    			attr_dev(span12, "class", "personal-name");
    			add_location(span12, file$4, 185, 32, 12310);
    			attr_dev(a19, "class", "a-clicked");
    			attr_dev(a19, "href", "#");
    			add_location(a19, file$4, 183, 28, 12162);
    			attr_dev(i19, "class", "fas fa-eye");
    			add_location(i19, file$4, 187, 52, 12461);
    			attr_dev(div30, "class", "view-count");
    			add_location(div30, file$4, 187, 28, 12437);
    			attr_dev(div31, "class", "col-12 mb-3");
    			add_location(div31, file$4, 182, 24, 12108);
    			attr_dev(article4, "class", "p-0 shadow-radius-section shadow-section mb-3");
    			add_location(article4, file$4, 130, 20, 8046);
    			attr_dev(img12, "class", "cu-image-com mr-1 ");
    			if (img12.src !== (img12_src_value = "image/afarine.jpg")) attr_dev(img12, "src", img12_src_value);
    			attr_dev(img12, "alt", "");
    			add_location(img12, file$4, 196, 44, 13023);
    			attr_dev(div32, "class", "col-2 col-sm-1 col-md-2 col-lg-1 p-0 pt-1");
    			add_location(div32, file$4, 195, 40, 12922);
    			set_style(i20, "color", "#048af7");
    			attr_dev(i20, "class", "fas fa-check-circle");
    			add_location(i20, file$4, 200, 94, 13417);
    			attr_dev(a20, "href", "#");
    			add_location(a20, file$4, 200, 52, 13375);
    			add_location(h62, file$4, 200, 48, 13371);
    			attr_dev(i21, "class", "fas fa-clock");
    			add_location(i21, file$4, 201, 80, 13565);
    			attr_dev(span13, "class", "show-time-custome");
    			add_location(span13, file$4, 201, 48, 13533);
    			attr_dev(div33, "class", "cu-intro mt-2");
    			add_location(div33, file$4, 199, 44, 13295);
    			attr_dev(div34, "class", "col-9 px-0 mr-1 mr-sm-4 mr-md-3 mr-lg-4 justify-content-center");
    			add_location(div34, file$4, 198, 40, 13174);
    			attr_dev(div35, "class", "row ");
    			add_location(div35, file$4, 194, 36, 12863);
    			attr_dev(div36, "class", "col-11 col-md-11");
    			add_location(div36, file$4, 193, 32, 12795);
    			attr_dev(i22, "class", "fas fa-ellipsis-v ");
    			attr_dev(i22, "type", "button");
    			attr_dev(i22, "data-toggle", "dropdown");
    			add_location(i22, file$4, 207, 32, 13901);
    			attr_dev(i23, "class", "far fa-bookmark");
    			add_location(i23, file$4, 209, 93, 14139);
    			attr_dev(a21, "href", "#");
    			add_location(a21, file$4, 209, 81, 14127);
    			add_location(li6, file$4, 209, 36, 14082);
    			attr_dev(i24, "class", "fas fa-share-alt");
    			add_location(i24, file$4, 210, 52, 14248);
    			attr_dev(a22, "href", "#");
    			add_location(a22, file$4, 210, 40, 14236);
    			add_location(li7, file$4, 210, 36, 14232);
    			attr_dev(i25, "class", "fas fa-flag");
    			add_location(i25, file$4, 211, 52, 14357);
    			attr_dev(a23, "href", "#");
    			add_location(a23, file$4, 211, 40, 14345);
    			add_location(li8, file$4, 211, 36, 14341);
    			attr_dev(ul2, "class", "dropdown-menu ellipsis-menu");
    			add_location(ul2, file$4, 208, 32, 14005);
    			attr_dev(div37, "class", "col-1 ml-0 pl-0 pr-4 dropdown");
    			add_location(div37, file$4, 206, 32, 13825);
    			attr_dev(div38, "class", "row justify-content-between p-2");
    			add_location(div38, file$4, 192, 28, 12717);
    			attr_dev(div39, "class", "col-12");
    			add_location(div39, file$4, 191, 24, 12668);
    			attr_dev(a24, "href", "#");
    			add_location(a24, file$4, 217, 72, 14669);
    			attr_dev(h32, "class", "title-post mt-1 mb-0 py-3 pr-3");
    			add_location(h32, file$4, 217, 28, 14625);
    			attr_dev(div40, "class", "col-12 p-0");
    			add_location(div40, file$4, 216, 24, 14572);
    			if (img13.src !== (img13_src_value = "20.jpg")) attr_dev(img13, "src", img13_src_value);
    			attr_dev(img13, "class", "p-0 mr-0 w-100 responsive-imagePost-height");
    			attr_dev(img13, "alt", "");
    			add_location(img13, file$4, 220, 28, 14867);
    			attr_dev(div41, "class", "col-12 p-0 mx-0 responsive-imagePost-height");
    			add_location(div41, file$4, 219, 24, 14781);
    			attr_dev(span14, "id", "dots");
    			add_location(span14, file$4, 226, 114, 15408);
    			attr_dev(span15, "id", "more");
    			add_location(span15, file$4, 226, 140, 15434);
    			attr_dev(span16, "id", "myBtn");
    			set_style(span16, "cursor", "pointer");
    			add_location(span16, file$4, 233, 28, 16097);
    			attr_dev(p2, "class", "col-12 mt-3 post-text");
    			add_location(p2, file$4, 223, 24, 15024);
    			attr_dev(button2, "id", "read-more");
    			attr_dev(button2, "class", "btn btn-sm btn-danger col-12 col-md-2 my-1 p-1 offset-0 offset-md-10");
    			add_location(button2, file$4, 238, 32, 16359);
    			attr_dev(a25, "href", "#");
    			add_location(a25, file$4, 237, 28, 16314);
    			attr_dev(div42, "class", "col-12 ");
    			add_location(div42, file$4, 236, 24, 16264);
    			attr_dev(hr2, "class", "col-11 mx-auto");
    			add_location(hr2, file$4, 241, 24, 16567);
    			attr_dev(img14, "class", "personal-img");
    			if (img14.src !== (img14_src_value = "image/4.jpeg")) attr_dev(img14, "src", img14_src_value);
    			attr_dev(img14, "alt", "");
    			add_location(img14, file$4, 244, 32, 16736);
    			attr_dev(span17, "class", "personal-name");
    			add_location(span17, file$4, 245, 32, 16821);
    			attr_dev(a26, "class", "a-clicked");
    			attr_dev(a26, "href", "#");
    			add_location(a26, file$4, 243, 28, 16673);
    			attr_dev(i26, "class", "fas fa-eye");
    			add_location(i26, file$4, 247, 52, 16966);
    			attr_dev(div43, "class", "view-count");
    			add_location(div43, file$4, 247, 28, 16942);
    			attr_dev(div44, "class", "col-12 mb-3");
    			add_location(div44, file$4, 242, 24, 16619);
    			attr_dev(article5, "class", "p-0 shadow-radius-section shadow-section mb-3");
    			add_location(article5, file$4, 190, 20, 12580);
    			attr_dev(div45, "class", "col-12 p-0 main-article");
    			add_location(div45, file$4, 69, 16, 3485);
    			attr_dev(section1, "class", "row mx-0 mt-3 mr-0 pt-0 bg-light ");
    			add_location(section1, file$4, 68, 12, 3417);
    			attr_dev(aside1, "class", "col-12 col-md-7 mx-2 order-first order-md-0 ");
    			add_location(aside1, file$4, 23, 8, 727);
    			attr_dev(aside2, "class", "col-12 col-md-2 mx-1 mt-5 mt-md-0 bg-light shadow-radius-section");
    			add_location(aside2, file$4, 255, 8, 17177);
    			attr_dev(div46, "class", "row justify-content-center mx-lg-2");
    			add_location(div46, file$4, 21, 4, 567);
    			attr_dev(main, "class", "container-fluid pin-parent ");
    			add_location(main, file$4, 20, 0, 503);
    			add_location(br0, file$4, 260, 0, 17305);
    			attr_dev(hr3, "class", "col-10 offset-1");
    			add_location(hr3, file$4, 260, 4, 17309);
    			add_location(br1, file$4, 260, 32, 17337);
    			add_location(br2, file$4, 260, 36, 17341);
    			add_location(br3, file$4, 260, 40, 17345);
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
    			append_dev(p0, t42);
    			append_dev(p0, span4);
    			append_dev(p0, span5);
    			append_dev(p0, t45);
    			append_dev(p0, span6);
    			append_dev(article3, t47);
    			append_dev(article3, div16);
    			append_dev(div16, a11);
    			append_dev(a11, button0);
    			append_dev(article3, t49);
    			append_dev(article3, hr0);
    			append_dev(article3, t50);
    			append_dev(article3, div18);
    			append_dev(div18, a12);
    			append_dev(a12, img8);
    			append_dev(a12, t51);
    			append_dev(a12, span7);
    			append_dev(a12, t53);
    			append_dev(div18, t54);
    			append_dev(div18, div17);
    			append_dev(div17, i12);
    			append_dev(div17, t55);
    			append_dev(div45, t56);
    			append_dev(div45, article4);
    			append_dev(article4, div26);
    			append_dev(div26, div25);
    			append_dev(div25, div23);
    			append_dev(div23, div22);
    			append_dev(div22, div19);
    			append_dev(div19, img9);
    			append_dev(div22, t57);
    			append_dev(div22, div21);
    			append_dev(div21, div20);
    			append_dev(div20, h61);
    			append_dev(h61, a13);
    			append_dev(a13, t58);
    			append_dev(a13, i13);
    			append_dev(div20, t59);
    			append_dev(div20, span8);
    			append_dev(span8, i14);
    			append_dev(span8, t60);
    			append_dev(div25, t61);
    			append_dev(div25, div24);
    			append_dev(div24, i15);
    			append_dev(div24, t62);
    			append_dev(div24, ul1);
    			append_dev(ul1, li3);
    			append_dev(li3, a14);
    			append_dev(a14, i16);
    			append_dev(a14, t63);
    			append_dev(ul1, t64);
    			append_dev(ul1, li4);
    			append_dev(li4, a15);
    			append_dev(a15, i17);
    			append_dev(a15, t65);
    			append_dev(ul1, t66);
    			append_dev(ul1, li5);
    			append_dev(li5, a16);
    			append_dev(a16, i18);
    			append_dev(a16, t67);
    			append_dev(article4, t68);
    			append_dev(article4, div27);
    			append_dev(div27, h31);
    			append_dev(h31, a17);
    			append_dev(article4, t70);
    			append_dev(article4, div28);
    			append_dev(div28, img10);
    			append_dev(article4, t71);
    			append_dev(article4, p1);
    			append_dev(p1, t72);
    			append_dev(p1, span9);
    			append_dev(p1, span10);
    			append_dev(p1, t75);
    			append_dev(p1, span11);
    			append_dev(article4, t77);
    			append_dev(article4, div29);
    			append_dev(div29, a18);
    			append_dev(a18, button1);
    			append_dev(article4, t79);
    			append_dev(article4, hr1);
    			append_dev(article4, t80);
    			append_dev(article4, div31);
    			append_dev(div31, a19);
    			append_dev(a19, img11);
    			append_dev(a19, t81);
    			append_dev(a19, span12);
    			append_dev(a19, t83);
    			append_dev(div31, t84);
    			append_dev(div31, div30);
    			append_dev(div30, i19);
    			append_dev(div30, t85);
    			append_dev(div45, t86);
    			append_dev(div45, article5);
    			append_dev(article5, div39);
    			append_dev(div39, div38);
    			append_dev(div38, div36);
    			append_dev(div36, div35);
    			append_dev(div35, div32);
    			append_dev(div32, img12);
    			append_dev(div35, t87);
    			append_dev(div35, div34);
    			append_dev(div34, div33);
    			append_dev(div33, h62);
    			append_dev(h62, a20);
    			append_dev(a20, t88);
    			append_dev(a20, i20);
    			append_dev(div33, t89);
    			append_dev(div33, span13);
    			append_dev(span13, i21);
    			append_dev(span13, t90);
    			append_dev(div38, t91);
    			append_dev(div38, div37);
    			append_dev(div37, i22);
    			append_dev(div37, t92);
    			append_dev(div37, ul2);
    			append_dev(ul2, li6);
    			append_dev(li6, a21);
    			append_dev(a21, i23);
    			append_dev(a21, t93);
    			append_dev(ul2, t94);
    			append_dev(ul2, li7);
    			append_dev(li7, a22);
    			append_dev(a22, i24);
    			append_dev(a22, t95);
    			append_dev(ul2, t96);
    			append_dev(ul2, li8);
    			append_dev(li8, a23);
    			append_dev(a23, i25);
    			append_dev(a23, t97);
    			append_dev(article5, t98);
    			append_dev(article5, div40);
    			append_dev(div40, h32);
    			append_dev(h32, a24);
    			append_dev(article5, t100);
    			append_dev(article5, div41);
    			append_dev(div41, img13);
    			append_dev(article5, t101);
    			append_dev(article5, p2);
    			append_dev(p2, t102);
    			append_dev(p2, span14);
    			append_dev(p2, span15);
    			append_dev(p2, t105);
    			append_dev(p2, span16);
    			append_dev(article5, t107);
    			append_dev(article5, div42);
    			append_dev(div42, a25);
    			append_dev(a25, button2);
    			append_dev(article5, t109);
    			append_dev(article5, hr2);
    			append_dev(article5, t110);
    			append_dev(article5, div44);
    			append_dev(div44, a26);
    			append_dev(a26, img14);
    			append_dev(a26, t111);
    			append_dev(a26, span17);
    			append_dev(a26, t113);
    			append_dev(div44, t114);
    			append_dev(div44, div43);
    			append_dev(div43, i26);
    			append_dev(div43, t115);
    			append_dev(div46, t116);
    			append_dev(div46, aside2);
    			insert_dev(target, t118, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, hr3, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, br2, anchor);
    			insert_dev(target, br3, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "scroll", () => {
    						scrolling = true;
    						clearTimeout(scrolling_timeout);
    						scrolling_timeout = setTimeout(clear_scrolling, 100);
    						/*onwindowscroll*/ ctx[2]();
    					}),
    					listen_dev(span6, "click", myFunction, false, false, false),
    					listen_dev(span11, "click", myFunction, false, false, false),
    					listen_dev(span16, "click", myFunction, false, false, false)
    				];

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
    			if (detaching) detach_dev(t118);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(hr3);
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
    	let { y } = $$props;
    	const writable_props = ["url", "y"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	function onwindowscroll() {
    		$$invalidate(0, y = window.pageYOffset);
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
    		circIn,
    		Router,
    		Link,
    		Route,
    		about: About,
    		url,
    		y
    	});

    	$$self.$inject_state = $$props => {
    		if ("url" in $$props) $$invalidate(1, url = $$props.url);
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [y, url, onwindowscroll];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { url: 1, y: 0 });

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
    	}

    	get url() {
    		throw new Error("<Home>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Home>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get y() {
    		throw new Error("<Home>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<Home>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/layout/Nav.svelte generated by Svelte v3.38.3 */
    const file$3 = "src/layout/Nav.svelte";

    // (26:36) <Link to="/" class="menu-item-link-color">
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
    			add_location(br, file$3, 27, 106, 1149);
    			attr_dev(span, "class", "menu-item ");
    			add_location(span, file$3, 27, 81, 1124);
    			attr_dev(i, "class", "fas fa-home ml-1 p-0 m-0");
    			add_location(i, file$3, 27, 44, 1087);
    			set_style(div, "height", "25px");
    			attr_dev(div, "class", "col-12 mt-2 px-auto menu-icon pb-0 mb-0");
    			add_location(div, file$3, 26, 40, 967);
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
    		source: "(26:36) <Link to=\\\"/\\\" class=\\\"menu-item-link-color\\\">",
    		ctx
    	});

    	return block;
    }

    // (33:36) <Link class="menu-item-link-color" to="contact">
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
    			t = text("تماس باما");
    			add_location(br, file$3, 34, 111, 1665);
    			attr_dev(span, "class", "menu-item ");
    			add_location(span, file$3, 34, 86, 1640);
    			attr_dev(i, "class", "fas fa-mail-bulk ml-1 p-0 m-0");
    			add_location(i, file$3, 34, 44, 1598);
    			set_style(div, "height", "25px");
    			attr_dev(div, "class", "col-12 mt-2 px-auto menu-icon ");
    			add_location(div, file$3, 33, 40, 1487);
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
    		source: "(33:36) <Link class=\\\"menu-item-link-color\\\" to=\\\"contact\\\">",
    		ctx
    	});

    	return block;
    }

    // (40:36) <Link class="menu-item-link-color" to="about">
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
    			t = text("درباره ما");
    			add_location(br, file$3, 41, 113, 2194);
    			attr_dev(span, "class", "menu-item ");
    			add_location(span, file$3, 41, 88, 2169);
    			attr_dev(i, "class", "fas fa-info-circle ml-1 p-0 m-0");
    			add_location(i, file$3, 41, 44, 2125);
    			set_style(div, "height", "25px");
    			attr_dev(div, "class", "col-12 mt-2 px-auto menu-icon pb-0 mb-0");
    			add_location(div, file$3, 40, 40, 2005);
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
    		source: "(40:36) <Link class=\\\"menu-item-link-color\\\" to=\\\"about\\\">",
    		ctx
    	});

    	return block;
    }

    // (47:36) <Link class="menu-item-link-color" to="blog">
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
    			t = text("آفرینه");
    			add_location(br, file$3, 48, 109, 2718);
    			attr_dev(span, "class", "menu-item ");
    			add_location(span, file$3, 48, 84, 2693);
    			attr_dev(i, "class", "fas fa-feather ml-1 p-0 m-0");
    			add_location(i, file$3, 48, 44, 2653);
    			set_style(div, "height", "25px");
    			attr_dev(div, "class", "col-12 mt-2 px-auto menu-icon pb-0 mb-0");
    			add_location(div, file$3, 47, 40, 2533);
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
    		source: "(47:36) <Link class=\\\"menu-item-link-color\\\" to=\\\"blog\\\">",
    		ctx
    	});

    	return block;
    }

    // (65:20) <Link to="/">
    function create_default_slot_1(ctx) {
    	let div1;
    	let div0;
    	let span0;
    	let span1;
    	let t2;
    	let div2;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "لینکس";
    			span1 = element("span");
    			span1.textContent = "اینو";
    			t2 = space();
    			div2 = element("div");
    			img = element("img");
    			attr_dev(span0, "class", "brand-icon-custome");
    			set_style(span0, "color", "#F7A63C");
    			add_location(span0, file$3, 67, 32, 3817);
    			attr_dev(span1, "class", "brand-icon-custome");
    			set_style(span1, "color", "#27a7f9");
    			add_location(span1, file$3, 67, 101, 3886);
    			attr_dev(div0, "class", "brand-text mx-0");
    			add_location(div0, file$3, 66, 28, 3753);
    			attr_dev(div1, "class", "col-7 ");
    			add_location(div1, file$3, 65, 24, 3704);
    			if (img.src !== (img_src_value = "1.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "brand-icon");
    			attr_dev(img, "alt", "");
    			add_location(img, file$3, 71, 28, 4099);
    			attr_dev(div2, "class", "col-1 h-100");
    			add_location(div2, file$3, 70, 24, 4045);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, span0);
    			append_dev(div0, span1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, img);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(65:20) <Link to=\\\"/\\\">",
    		ctx
    	});

    	return block;
    }

    // (15:0) <Router url="{url}">
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
    				class: "menu-item-link-color",
    				to: "contact",
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	link2 = new Link({
    			props: {
    				class: "menu-item-link-color",
    				to: "about",
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	link3 = new Link({
    			props: {
    				class: "menu-item-link-color",
    				to: "blog",
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
    			props: { path: "blog", component: Blog },
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
    			attr_dev(div0, "class", "col-2 col-md-1");
    			add_location(div0, file$3, 24, 32, 819);
    			attr_dev(div1, "class", "col-2 col-md-1 ");
    			add_location(div1, file$3, 31, 32, 1332);
    			attr_dev(div2, "class", "col-2 col-md-1 ");
    			add_location(div2, file$3, 38, 32, 1852);
    			attr_dev(div3, "class", "col-2 col-md-1 ");
    			add_location(div3, file$3, 45, 32, 2381);
    			add_location(br, file$3, 55, 109, 3284);
    			attr_dev(i0, "class", "fas fa-sort-down");
    			add_location(i0, file$3, 55, 113, 3288);
    			attr_dev(span, "class", "menu-item ");
    			add_location(span, file$3, 55, 84, 3259);
    			attr_dev(i1, "class", "fas fa-toolbox ml-1 p-0 m-0");
    			add_location(i1, file$3, 55, 44, 3219);
    			set_style(div4, "height", "25px");
    			attr_dev(div4, "class", "col-12 mt-2 px-auto menu-icon pb-0 mb-0 dropdown");
    			add_location(div4, file$3, 54, 40, 3090);
    			attr_dev(div5, "class", "menu-item-link-color");
    			add_location(div5, file$3, 53, 36, 3015);
    			attr_dev(div6, "class", "col-2 col-md-1");
    			attr_dev(div6, "data-toggle", "modal");
    			attr_dev(div6, "data-target", "#exampleModal");
    			add_location(div6, file$3, 52, 32, 2902);
    			attr_dev(div7, "class", "row justify-content-center");
    			set_style(div7, "direction", "rtl");
    			add_location(div7, file$3, 23, 28, 721);
    			attr_dev(div8, "class", "col-12");
    			add_location(div8, file$3, 21, 24, 643);
    			attr_dev(div9, "class", "row ");
    			add_location(div9, file$3, 20, 20, 600);
    			attr_dev(div10, "class", "col-9");
    			add_location(div10, file$3, 19, 16, 560);
    			attr_dev(div11, "class", "col-3 col-md-2 pl-5 pl-md-3");
    			add_location(div11, file$3, 63, 16, 3604);
    			attr_dev(div12, "class", "row justify-content-between ");
    			add_location(div12, file$3, 18, 12, 501);
    			attr_dev(nav, "class", "container-fluid ");
    			add_location(nav, file$3, 17, 8, 458);
    			attr_dev(header, "class", "sticky-top shadow-sm");
    			add_location(header, file$3, 16, 4, 411);
    			add_location(div13, file$3, 78, 4, 4277);
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
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const link0_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				link0_changes.$$scope = { dirty, ctx };
    			}

    			link0.$set(link0_changes);
    			const link1_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				link1_changes.$$scope = { dirty, ctx };
    			}

    			link1.$set(link1_changes);
    			const link2_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				link2_changes.$$scope = { dirty, ctx };
    			}

    			link2.$set(link2_changes);
    			const link3_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				link3_changes.$$scope = { dirty, ctx };
    			}

    			link3.$set(link3_changes);
    			const link4_changes = {};

    			if (dirty & /*$$scope*/ 4) {
    				link4_changes.$$scope = { dirty, ctx };
    			}

    			link4.$set(link4_changes);
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
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(15:0) <Router url=\\\"{url}\\\">",
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
    			button.textContent = "Close";
    			attr_dev(div0, "class", "nav flex-sm-column flex-row text-center");
    			add_location(div0, file$3, 89, 20, 4792);
    			attr_dev(div1, "class", "modal-body");
    			add_location(div1, file$3, 88, 16, 4747);
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-secondary");
    			attr_dev(button, "data-dismiss", "modal");
    			add_location(button, file$3, 94, 20, 5004);
    			attr_dev(div2, "class", "modal-footer");
    			add_location(div2, file$3, 93, 16, 4957);
    			attr_dev(div3, "class", "modal-content");
    			add_location(div3, file$3, 87, 12, 4703);
    			attr_dev(div4, "class", "modal-dialog");
    			attr_dev(div4, "role", "document");
    			add_location(div4, file$3, 86, 8, 4648);
    			attr_dev(div5, "class", "modal left fade");
    			attr_dev(div5, "id", "exampleModal");
    			attr_dev(div5, "tabindex", "");
    			attr_dev(div5, "role", "dialog");
    			attr_dev(div5, "aria-labelledby", "exampleModalLabel");
    			attr_dev(div5, "aria-hidden", "true");
    			add_location(div5, file$3, 85, 4, 4511);
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

    			if (dirty & /*$$scope*/ 4) {
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
    	const writable_props = ["url", "y"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Nav> was created with unknown prop '${key}'`);
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
    		blog: Blog,
    		home: Home,
    		url,
    		y
    	});

    	$$self.$inject_state = $$props => {
    		if ("url" in $$props) $$invalidate(0, url = $$props.url);
    		if ("y" in $$props) $$invalidate(1, y = $$props.y);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [url, y];
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
    			console.warn("<Nav> was created without expected prop 'y'");
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
    	let div8;
    	let div7;
    	let div0;
    	let form;
    	let fieldset0;
    	let input;
    	let t0;
    	let fieldset1;
    	let textarea;
    	let t1;
    	let fieldset2;
    	let button;
    	let t3;
    	let div2;
    	let h50;
    	let t5;
    	let hr;
    	let t6;
    	let div1;
    	let ul0;
    	let li0;
    	let a0;
    	let i0;
    	let t7;
    	let li1;
    	let a1;
    	let i1;
    	let t8;
    	let li2;
    	let a2;
    	let i2;
    	let t9;
    	let li3;
    	let a3;
    	let i3;
    	let t10;
    	let br;
    	let t11;
    	let div6;
    	let h51;
    	let i4;
    	let t12;
    	let span0;
    	let span1;
    	let t15;
    	let div5;
    	let div3;
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
    	let div4;
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
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowscroll*/ ctx[1]);

    	const block = {
    		c: function create() {
    			footer = element("footer");
    			div8 = element("div");
    			div7 = element("div");
    			div0 = element("div");
    			form = element("form");
    			fieldset0 = element("fieldset");
    			input = element("input");
    			t0 = space();
    			fieldset1 = element("fieldset");
    			textarea = element("textarea");
    			t1 = space();
    			fieldset2 = element("fieldset");
    			button = element("button");
    			button.textContent = "ارسال";
    			t3 = space();
    			div2 = element("div");
    			h50 = element("h5");
    			h50.textContent = "ما را در شبکه های اجتماعی دنبال کنید";
    			t5 = space();
    			hr = element("hr");
    			t6 = space();
    			div1 = element("div");
    			ul0 = element("ul");
    			li0 = element("li");
    			a0 = element("a");
    			i0 = element("i");
    			t7 = space();
    			li1 = element("li");
    			a1 = element("a");
    			i1 = element("i");
    			t8 = space();
    			li2 = element("li");
    			a2 = element("a");
    			i2 = element("i");
    			t9 = space();
    			li3 = element("li");
    			a3 = element("a");
    			i3 = element("i");
    			t10 = space();
    			br = element("br");
    			t11 = space();
    			div6 = element("div");
    			h51 = element("h5");
    			i4 = element("i");
    			t12 = space();
    			span0 = element("span");
    			span0.textContent = "اینو";
    			span1 = element("span");
    			span1.textContent = "لینکس";
    			t15 = space();
    			div5 = element("div");
    			div3 = element("div");
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
    			div4 = element("div");
    			ul2 = element("ul");
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
    			set_style(input, "text-align", "right");
    			set_style(input, "font-family", "BYekan");
    			attr_dev(input, "type", "email");
    			attr_dev(input, "class", "form-control svelte-ph1nu5");
    			attr_dev(input, "id", "exampleInputEmail1");
    			attr_dev(input, "placeholder", "لطفا ایمیل خود را وارد کنید");
    			add_location(input, file$2, 71, 24, 1275);
    			attr_dev(fieldset0, "class", "form-group svelte-ph1nu5");
    			add_location(fieldset0, file$2, 70, 20, 1212);
    			set_style(textarea, "text-align", "right");
    			set_style(textarea, "font-family", "BYekan");
    			attr_dev(textarea, "class", "form-control svelte-ph1nu5");
    			attr_dev(textarea, "id", "exampleMessage");
    			attr_dev(textarea, "placeholder", "متن");
    			add_location(textarea, file$2, 74, 24, 1536);
    			attr_dev(fieldset1, "class", "form-group svelte-ph1nu5");
    			add_location(fieldset1, file$2, 73, 20, 1482);
    			set_style(button, "text-align", "right");
    			set_style(button, "font-family", "BYekan");
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn btn-danger btn-lg");
    			add_location(button, file$2, 77, 24, 1784);
    			attr_dev(fieldset2, "class", "form-group text-xs-right svelte-ph1nu5");
    			add_location(fieldset2, file$2, 76, 20, 1716);
    			set_style(form, "direction", "rtl");
    			add_location(form, file$2, 69, 16, 1161);
    			attr_dev(div0, "class", "col-md-4");
    			add_location(div0, file$2, 68, 12, 1122);
    			attr_dev(h50, "class", "text-md-right");
    			add_location(h50, file$2, 82, 16, 2063);
    			add_location(hr, file$2, 83, 16, 2147);
    			attr_dev(i0, "class", "fab fa-github fa-lg svelte-ph1nu5");
    			add_location(i0, file$2, 86, 78, 2302);
    			attr_dev(a0, "href", "");
    			attr_dev(a0, "class", "nav-link pl-0 svelte-ph1nu5");
    			add_location(a0, file$2, 86, 45, 2269);
    			attr_dev(li0, "class", "nav-item");
    			add_location(li0, file$2, 86, 24, 2248);
    			attr_dev(i1, "class", "fab fa-twitter fa-lg svelte-ph1nu5");
    			add_location(i1, file$2, 87, 73, 2420);
    			attr_dev(a1, "href", "");
    			attr_dev(a1, "class", "nav-link svelte-ph1nu5");
    			add_location(a1, file$2, 87, 45, 2392);
    			attr_dev(li1, "class", "nav-item");
    			add_location(li1, file$2, 87, 24, 2371);
    			attr_dev(i2, "class", "fas fa-check-circle fa-lg svelte-ph1nu5");
    			add_location(i2, file$2, 88, 73, 2539);
    			attr_dev(a2, "href", "");
    			attr_dev(a2, "class", "nav-link svelte-ph1nu5");
    			add_location(a2, file$2, 88, 45, 2511);
    			attr_dev(li2, "class", "nav-item");
    			add_location(li2, file$2, 88, 24, 2490);
    			attr_dev(i3, "class", "fab fa-instagram fa-lg svelte-ph1nu5");
    			add_location(i3, file$2, 89, 73, 2663);
    			attr_dev(a3, "href", "");
    			attr_dev(a3, "class", "nav-link svelte-ph1nu5");
    			add_location(a3, file$2, 89, 45, 2635);
    			attr_dev(li3, "class", "nav-item");
    			add_location(li3, file$2, 89, 24, 2614);
    			attr_dev(ul0, "class", "nav");
    			add_location(ul0, file$2, 85, 20, 2206);
    			add_location(br, file$2, 91, 20, 2757);
    			attr_dev(div1, "class", "row");
    			add_location(div1, file$2, 84, 16, 2168);
    			attr_dev(div2, "class", "col-md-4 order-md-first");
    			set_style(div2, "direction", "rtl");
    			add_location(div2, file$2, 81, 12, 1985);
    			attr_dev(i4, "class", "fas fa-link svelte-ph1nu5");
    			add_location(i4, file$2, 95, 45, 2934);
    			add_location(span0, file$2, 95, 73, 2962);
    			add_location(span1, file$2, 95, 90, 2979);
    			set_style(h51, "font-size", "30px");
    			add_location(h51, file$2, 95, 16, 2905);
    			attr_dev(a4, "href", "");
    			attr_dev(a4, "class", "svelte-ph1nu5");
    			add_location(a4, file$2, 99, 32, 3160);
    			add_location(li4, file$2, 99, 28, 3156);
    			attr_dev(a5, "href", "");
    			attr_dev(a5, "class", "svelte-ph1nu5");
    			add_location(a5, file$2, 100, 32, 3233);
    			add_location(li5, file$2, 100, 28, 3229);
    			attr_dev(a6, "href", "");
    			attr_dev(a6, "class", "svelte-ph1nu5");
    			add_location(a6, file$2, 101, 32, 3298);
    			add_location(li6, file$2, 101, 28, 3294);
    			attr_dev(a7, "href", "");
    			attr_dev(a7, "class", "svelte-ph1nu5");
    			add_location(a7, file$2, 102, 32, 3370);
    			add_location(li7, file$2, 102, 28, 3366);
    			attr_dev(ul1, "class", "list-unstyled");
    			add_location(ul1, file$2, 98, 24, 3101);
    			attr_dev(div3, "class", "col-6");
    			add_location(div3, file$2, 97, 20, 3057);
    			attr_dev(a8, "href", "");
    			attr_dev(a8, "class", "svelte-ph1nu5");
    			add_location(a8, file$2, 107, 32, 3591);
    			add_location(li8, file$2, 107, 28, 3587);
    			attr_dev(a9, "href", "");
    			attr_dev(a9, "class", "svelte-ph1nu5");
    			add_location(a9, file$2, 108, 32, 3662);
    			add_location(li9, file$2, 108, 28, 3658);
    			attr_dev(a10, "href", "");
    			attr_dev(a10, "class", "svelte-ph1nu5");
    			add_location(a10, file$2, 109, 32, 3728);
    			add_location(li10, file$2, 109, 28, 3724);
    			attr_dev(a11, "href", "");
    			attr_dev(a11, "class", "svelte-ph1nu5");
    			add_location(a11, file$2, 110, 32, 3796);
    			add_location(li11, file$2, 110, 28, 3792);
    			attr_dev(ul2, "class", "list-unstyled");
    			add_location(ul2, file$2, 106, 24, 3532);
    			attr_dev(div4, "class", "col-6");
    			add_location(div4, file$2, 105, 20, 3488);
    			attr_dev(div5, "class", "row");
    			add_location(div5, file$2, 96, 16, 3019);
    			attr_dev(div6, "class", "col-md-4 order-first order-md-last");
    			set_style(div6, "direction", "rtl");
    			add_location(div6, file$2, 94, 12, 2816);
    			attr_dev(div7, "class", "row");
    			add_location(div7, file$2, 66, 8, 1079);
    			attr_dev(div8, "class", "container");
    			add_location(div8, file$2, 65, 4, 1047);
    			attr_dev(footer, "class", "footer svelte-ph1nu5");
    			set_style(footer, "font-family", "'BYekan' ");
    			add_location(footer, file$2, 64, 0, 987);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, footer, anchor);
    			append_dev(footer, div8);
    			append_dev(div8, div7);
    			append_dev(div7, div0);
    			append_dev(div0, form);
    			append_dev(form, fieldset0);
    			append_dev(fieldset0, input);
    			append_dev(form, t0);
    			append_dev(form, fieldset1);
    			append_dev(fieldset1, textarea);
    			append_dev(form, t1);
    			append_dev(form, fieldset2);
    			append_dev(fieldset2, button);
    			append_dev(div7, t3);
    			append_dev(div7, div2);
    			append_dev(div2, h50);
    			append_dev(div2, t5);
    			append_dev(div2, hr);
    			append_dev(div2, t6);
    			append_dev(div2, div1);
    			append_dev(div1, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, a0);
    			append_dev(a0, i0);
    			append_dev(ul0, t7);
    			append_dev(ul0, li1);
    			append_dev(li1, a1);
    			append_dev(a1, i1);
    			append_dev(ul0, t8);
    			append_dev(ul0, li2);
    			append_dev(li2, a2);
    			append_dev(a2, i2);
    			append_dev(ul0, t9);
    			append_dev(ul0, li3);
    			append_dev(li3, a3);
    			append_dev(a3, i3);
    			append_dev(div1, t10);
    			append_dev(div1, br);
    			append_dev(div7, t11);
    			append_dev(div7, div6);
    			append_dev(div6, h51);
    			append_dev(h51, i4);
    			append_dev(h51, t12);
    			append_dev(h51, span0);
    			append_dev(h51, span1);
    			append_dev(div6, t15);
    			append_dev(div6, div5);
    			append_dev(div5, div3);
    			append_dev(div3, ul1);
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
    			append_dev(div5, t23);
    			append_dev(div5, div4);
    			append_dev(div4, ul2);
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

    const { console: console_1, setTimeout: setTimeout_1 } = globals;
    const file = "src/App.svelte";

    // (22:0) {#if loading===true}
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
    			add_location(span, file, 23, 66, 591);
    			set_style(div, "direction", "rtl");
    			set_style(div, "text-align", "center");
    			set_style(div, "margin", "auto");
    			set_style(div, "width", "100%");
    			set_style(div, "height", "100%");
    			add_location(div, file, 22, 1, 439);
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
    		source: "(22:0) {#if loading===true}",
    		ctx
    	});

    	return block;
    }

    // (28:0) {#if loading===false}
    function create_if_block(ctx) {
    	let div;
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
    			div = element("div");
    			create_component(nav.$$.fragment);
    			t = space();
    			create_component(footer.$$.fragment);
    			attr_dev(div, "class", "class");
    			add_location(div, file, 28, 0, 719);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(nav, div, null);
    			append_dev(div, t);
    			mount_component(footer, div, null);
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
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(28:0) {#if loading===false}",
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
    	add_render_callback(/*onwindowscroll*/ ctx[2]);
    	let if_block0 = /*loading*/ ctx[1] === true && create_if_block_1(ctx);
    	let if_block1 = /*loading*/ ctx[1] === false && create_if_block(ctx);

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
    				dispose = listen_dev(window, "scroll", () => {
    					scrolling = true;
    					clearTimeout(scrolling_timeout);
    					scrolling_timeout = setTimeout_1(clear_scrolling, 100);
    					/*onwindowscroll*/ ctx[2]();
    				});

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

    			if (/*loading*/ ctx[1] === true) {
    				if (if_block0) {
    					if (dirty & /*loading*/ 2) {
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

    			if (/*loading*/ ctx[1] === false) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*loading*/ 2) {
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
    			dispose();
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

    	///
    	let loading = false;

    	setTimeout(
    		function () {
    			$$invalidate(1, loading = false);
    		},
    		2000
    	);

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function onwindowscroll() {
    		$$invalidate(0, y = window.pageYOffset);
    	}

    	$$self.$capture_state = () => ({
    		Nav,
    		Footer,
    		fade,
    		slide,
    		scale,
    		fly,
    		Wave,
    		y,
    		loading
    	});

    	$$self.$inject_state = $$props => {
    		if ("y" in $$props) $$invalidate(0, y = $$props.y);
    		if ("loading" in $$props) $$invalidate(1, loading = $$props.loading);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*y*/ 1) {
    			console.log(y);
    		}
    	};

    	return [y, loading, onwindowscroll];
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
