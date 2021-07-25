
<script>
	import Nav from "./layout/Nav.svelte";
	import Footer from "./layout/Footer.svelte";
	import {fade , slide , scale , fly} from "svelte/transition";
	import { Wave } from 'svelte-loading-spinners'
	
	let y=0;
	$: console.log(y);	
	///
	let loading = true;
	setTimeout(function(){
		loading = false;
	}, 3000);
</script>


<style global> 
	@import "/bootstrap.rtl.min.css";
	@import "/global.css";
</style>
{#if loading===true}
	<div style="direction: rtl;text-align:center;margin: auto;">
		<Wave size="100" color="green" unit="px" duration="1s" ></Wave><span class="loading-snipper">لطفا کمی صبر کنید...</span>
	</div>
{/if}
<svelte:window bind:scrollY={y}/>
{#if loading===false}
<div class="class">
	<Nav {y}/>
	<Footer {y}/>
</div>
{/if}
	







	
	
