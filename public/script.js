function myFunction() {
    var dots = document.getElementById("dots");
    var moreText = document.getElementById("more");
    var btnText = document.getElementById("myBtn");
    var readMore = document.getElementById("read-more");
  
    if (dots.style.display === "none") {
      dots.style.display = "inline";
      btnText.innerHTML = "";
      moreText.style.display = "none";
      readMore.style.display = "inline";

    
    } else {
      dots.style.display = "none";
      moreText.style.display = "inline";
      btnText.innerHTML = "";
      readMore.style.display = "inline";

    }
  }