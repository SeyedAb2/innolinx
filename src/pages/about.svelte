<script>
    import {fade , slide , scale} from "svelte/transition";
    var currentLocation = window.location.href;
    var splitUrl = currentLocation.split("/");
    var lastSugment = splitUrl[splitUrl.length - 1];
    //$ : console.log(lastSugment);

</script>
<svelte:head>
    <title>
        درباره ما
    </title>
</svelte:head>
<div transition:scale>
    about us
    
</div>