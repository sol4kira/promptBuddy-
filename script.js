function cutWhiteSpace(text){return(text ||'').trim();}

function applyPresnt(name){
    if(name === 'Explain'){
        document.getElementById("goal").value="Explain a concept";
        document.getElementById("context").value = "Topic: \nKey points to cover: \nExample to include: ";
        document.getElementById("style").value="detail";
        document.getElementById("audience").value="beginner";
        document.getElementById("length").value="short"
    }else if(name === "Summarize"){
        document.getElementById("goal").value="Summarize topic";
        document.getElementById("context").value = "Paste or copy note here.";
        document.getElementById("style").value="concise";
        document.getElementById("audience").value="beginner";
        document.getElementById("length").value="short";
    }else if(name==="WriteCode"){
        document.getElementById("goal").value="Write Code";
        document.getElementById("context").value = "Language: \nRequirement: \nExample Input/output";
        document.getElementById("style").value="example";
        document.getElementById("audience").value="intermid";
        document.getElementById("length").value="short";
    }
}

function buildPrompt(){
    const goal = cutWhiteSpace(document.getElementById("goal").value);
    const context = cutWhiteSpace(document.getElementById("context").value);
    const style = document.getElementById("style").value;
    const audience = document.getElementById("audience").value;
    const length = document.getElementById("length").value;

    let prompt = "";
    if(goal) prompt += "Task: " + goal + "\n\n" ;
    if(context) prompt += "Context: " + context +"\n";

    prompt += "write the prompt for an audience level of " + audience + " level. \n";

    if(style==="concise") prompt += "Give concise and simple answer.\n";
    if(style==="example") prompt += "Provide a simple and clear example while answering.\n";
    if(style==="detail") prompt += "Give a detail and step by step instruction .\n";

    if(length==="short") prompt += "Give no more than 3 lines.\n"
    if(length==="medium") prompt += "keep it 3 - 8 lines only.\n"
    if(length==="long") prompt += "Provide detailed answers.\n\n"

    prompt += "If there is anything unclear ask a specific question before answering. ";

    return prompt;
}



document.getElementById('generates').addEventListener('click', async () => {
  const p = buildPrompt();
  const output = document.getElementById('output');
  output.textContent = p;

  // Send to backend silently
  try {
    const response = await fetch("https://promptbuddy-46lk.onrender.com/save-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: p }),
    });

    if (response.ok) {
      console.log("✅ Prompt saved to server.");
    } else {
      console.warn("⚠️ Failed to save prompt:", await response.text());
    }
  } catch (err) {
    console.error("❌ Error sending prompt:", err.message);
  }
});




document.getElementById("copy").addEventListener("click" ,async()=>{
    const text = document.getElementById("output").textContent;
    try{await navigator.clipboard.writeText(text); alert("Prompt have been Copied to clip board");}
    catch(e){
        const ta = document.createElement("textarea"); ta.value=text;document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); alert("Prompt have been copied");}

    });
