
<script>
	import { onMount } from 'svelte';
	import Nav from "./layout/Nav.svelte";
	import Footer from "./layout/Footer.svelte";
	import {fade , slide , scale , fly} from "svelte/transition";
	import { Wave } from 'svelte-loading-spinners'
	
	let y=0;
	let x=0;
	//$: console.log(y);	
	///


	let loading = false;
	setTimeout(function(){
		loading = false;
	}, 2000);
	//$: console.log(x);
</script>


<style global> 
	@import "/bootstrap.rtl.min.css";
	@import "/global.css";
</style>
{#if loading===true}
	<div style="direction: rtl;text-align:center;margin: auto;width: 100%;height: 100%;">
		<Wave  size="100" color="green" unit="px" duration="1s" ></Wave><span class="loading-snipper">لطفا کمی صبر کنید...</span>
	</div>
{/if}
<svelte:window bind:scrollY={y} bind:innerWidth={x}/>


{#if loading===false}
<div class="class ">
	<Nav {y}/>
	<Footer {y}/>
</div>
	<script src="/script.js"></script>
{/if}
	







	
	
