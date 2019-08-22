import { Component } from '@angular/core';
import { LoadingController } from '@ionic/angular';
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
  public textoTraduzido: string = "";

  constructor(private speechRecognition: SpeechRecognition, private screenOrientation: ScreenOrientation, private statusBar: StatusBar, private tts: TextToSpeech, public loadingController: LoadingController) {
  }
  /** Converter o texto recebido em fala
  * @param {_text}
  * @param {_time}
  */

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

  /** COISAS A SER FEITA NO MOMENTO: 
   *  1-Quando clicar no botão, fazer com que o aplicativo pergunte o produto que ele deseja saber antes de ouvir o que a pessoa falar...
   *  2-Após informar o produto, fazer com que o aplicativo fale para o cliente que esta localizando o produto e se encontrado dizer se achou ou não...
  */

  startVoz(){
    let options = {
      language: 'pt-BR',
      matches: 1,
      prompt: 'Estou te ouvindo! :)',  
      showPopup: true,                
    }

    // Processo de reconhecimento de voz
    this.speechRecognition.startListening(options).subscribe(matches => {
      if(matches && matches.length > 0){
        this.textoTraduzido = matches[0]
        this.localizarProd(this.textoTraduzido)
        this.playVoz(this.textoTraduzido);
      }
    },(onerror) => {
      console.log('error:', onerror);    
    })
  }

  playVoz(_text){
    // Processo de falar
    this.tts.speak({
      text : _text,
      locale: 'pt-BR',
      rate: 1
    }).then(() => {
      console.log('Successo!!');
    })
    .catch((reason: any) => {
      console.log(reason);
    })
  }

  localizarProd(_text){
    if(_text == "uva"){      
      this.textoTraduzido = "Produto encontrado!";
    }else{
      this.textoTraduzido = "Produto não encontrado!";
    }
  }

  async controlerCarregamento(_text, _time) {
    const loading = await this.loadingController.create({
      spinner: "lines",
      duration: _time,
      message: _text,
      cssClass: 'custom-class custom-loading'
    });
    
    await loading.present();
    await loading.onDidDismiss();
    return console.log('Sucesso!');
  }


}

