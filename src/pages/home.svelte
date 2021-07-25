<script>
    import {onMount} from "svelte";
    import "../App.svelte";
    import {fade , slide , scale , fly} from "svelte/transition";
    import {circIn} from "svelte/easing";
    import { Router, Link, Route } from "svelte-routing";
    import about from "./about.svelte";
    export let url = "";
    export let y;
    //let y=0;
</script>
<style>
    @import "public/global.css";
</style>
<svelte:window bind:scrollY={y}/>

<br><hr class="col-10 offset-1"><br><br><br>


