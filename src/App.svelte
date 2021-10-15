
<script>
	import { onMount } from 'svelte';
	import Nav from "./layout/Nav.svelte";
	import Footer from "./layout/Footer.svelte";
	import Login from "./pages/Log_Sign/login.svelte";
	import Signup from "./pages/Log_Sign/signup.svelte";
	import {fade , slide , scale , fly} from "svelte/transition";
	import { Wave } from 'svelte-loading-spinners'
	
	let y=0;
	let x=0;
	//$: console.log(y);	
	///

	let currentLocation = window.location.href;
    let splitUrl = currentLocation.split("/");
    let lastSugment = splitUrl[splitUrl.length - 1];
	let loading = false;
	setTimeout(function(){
		loading = false;
	}, 2000);
	//$: console.log(x);
</script>


<style global> 
	@import "/css/bootstrap.rtl.min.css";
	@import "/global.css";
</style>
{#if loading===true}
	<div style="direction: rtl;text-align:center;margin: auto;width: 100%;height: 100%;">
		<Wave  size="100" color="green" unit="px" duration="1s" ></Wave><span class="loading-snipper">لطفا کمی صبر کنید...</span>
	</div>
{/if}
<svelte:window bind:scrollY={y} bind:innerWidth={x}/>


{#if loading===false}
<div class="class">
	{#if lastSugment!=='login' && lastSugment!=='login#' &&  lastSugment!=='signup#' &&  lastSugment!=='signup'}
		<Nav {y}/>
		<Footer {y}/>
	{:else if lastSugment==='login'}
		<Login />
	{:else if lastSugment==='signup'}
		<Signup />
	{/if}
</div>
	<script src="/script.js"></script>
	<script src="/js/dev.debug.js"></script>
{/if}

	







	
	
