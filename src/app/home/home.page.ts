import { Component } from '@angular/core';
import { SpeechRecognition } from '@ionic-native/speech-recognition/ngx';
import { ScreenOrientation } from '@ionic-native/screen-orientation/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { TextToSpeech } from '@ionic-native/text-to-speech/ngx';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  matches: Array<String>;

  constructor(private speechRecognition: SpeechRecognition, private screenOrientation: ScreenOrientation, private statusBar: StatusBar, private tts: TextToSpeech) {
  }

  ngOnInit(){

    // Definindo modo retrato
    this.screenOrientation.lock(this.screenOrientation.ORIENTATIONS.PORTRAIT);

    // Deixa o texto claro no statusBar
    this.statusBar.styleBlackOpaque();

    // Verificando a permissao de voz
    this.speechRecognition.hasPermission()
    .then((hasPermission: boolean) => {
      if (!hasPermission){
        // Solicita permissao
        this.speechRecognition.requestPermission()
        .then(
          () => console.log('Granted'),
          () => console.log('Denied')
        )
      }
    });
  }

  startVoz(){
    let options = {
      language: 'pt-BR',
      matches: 1,
      prompt: 'Estou te ouvindo! :)',  
      showPopup: true,                
    }
    // Processo de reconhecimento de voz
    this.speechRecognition.startListening(options).subscribe(matches => {
      this.matches = matches,      
      (onerror) => console.log('error:', onerror)
    })
  }

  playVoz(){
    // Processo de tocar voz
    this.tts.speak({
      text : this.matches.toString(),
      locale: 'pt-BR',
      rate: 1
    }).then(() => console.log('Success'))
    .catch((reason: any) => console.log(reason));
  }

}

