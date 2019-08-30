const request = require('request');

function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
}

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function boldAndTrimEachLine(input) {
    let lines = input.split('\n');
    let newText = '';
    lines.forEach((line, index) => {
        console.log(`Line ${index}: '${line}'`)
        const newLine =`*${(line.trim())}*\n`
        newText += newLine;
    });
    return newText;
}

function modSpeak(res, requestBody) {
    const pingChannel = requestBody.text.includes('-here');
    let modText = requestBody.text.trim();
    if (pingChannel) {
        modText = modText.replace('-here', '');
    }
    if (modText.includes('-tb') && modText.includes('-b')) {
        res.status(200).send({
            text: "Only Send one formatting flag (-b || -tb) Or use your own formatting(No flag)\nYour message has not been sent."
        });
    }
    modText = modText.includes('-tb') ? `*\`\`\`${requestBody.text.replace('-tb', '').trim()}\`\`\`*`
        : modText.includes('-b') ? boldAndTrimEachLine(modText.replace('-b',''))
        : modText;

    if (pingChannel) {
        modText = `<!here>\n${modText.trim()}`
    }
    request.post({
        url: requestBody.response_url,
        json: true,
        body: {
            response_type: 'in_channel',
            text: modText
        }
    });
    res.status(200).send({
        // //For Testing
        // text: modText,
        //For Real
        text: "Your message has been posted.",
    });
}

module.exports = {
    replaceAll,
    modSpeak,
};
